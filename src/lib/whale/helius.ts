import { getRedis } from "@/lib/watch/redis";
import { normalizeAddresses } from "./addresses";

const API = "https://api-mainnet.helius-rpc.com/v0/webhooks";
const SITE = process.env.HODL_PUBLIC_URL ?? "https://hodlterminal.vercel.app";
const WEBHOOK_URL = `${SITE}/api/helius/webhook`;
const ID_KEY = "helius:webhook:id";
const ADDRS_KEY = "helius:webhook:addrs";

export type SyncResult = {
  ok: boolean;
  action: "created" | "updated" | "unchanged" | "skipped";
  addresses: number;
  reason?: string;
};

async function call(method: string, url: string, body?: string): Promise<Response> {
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  });
}

async function findExisting(key: string): Promise<string | null> {
  const res = await call("GET", `${API}?api-key=${key}`);
  if (!res.ok) return null;
  const list = (await res.json()) as { webhookID?: string; webhookURL?: string }[];
  if (!Array.isArray(list)) return null;
  return list.find((w) => w.webhookURL === WEBHOOK_URL)?.webhookID ?? null;
}

/**
 * Tells Helius which pools to watch: creates the webhook the first time, then
 * updates it whenever the set of watched pools changes.
 */
export async function syncWhaleWebhook(): Promise<SyncResult> {
  const key = process.env.HELIUS_API_KEY;
  const secret = process.env.HELIUS_WEBHOOK_SECRET;
  if (!key || !secret) {
    return { ok: false, action: "skipped", addresses: 0, reason: "missing_env" };
  }

  const redis = getRedis();
  const mints = await redis.smembers("watched:mints");
  const pools =
    mints.length > 0
      ? await redis.mget<(string | null)[]>(...mints.map((m) => `pool:${m}`))
      : [];
  const addresses = normalizeAddresses(pools);
  if (addresses.length === 0) {
    return { ok: true, action: "skipped", addresses: 0, reason: "no_pools" };
  }

  const joined = addresses.join(",");
  const [lastAddrs, knownId] = await Promise.all([
    redis.get<string>(ADDRS_KEY),
    redis.get<string>(ID_KEY),
  ]);
  if (knownId && lastAddrs === joined) {
    return { ok: true, action: "unchanged", addresses: addresses.length };
  }

  const body = JSON.stringify({
    webhookURL: WEBHOOK_URL,
    transactionTypes: ["SWAP"],
    accountAddresses: addresses,
    webhookType: "enhanced",
    authHeader: secret,
  });

  let id = knownId ?? (await findExisting(key));
  if (id) {
    const res = await call("PUT", `${API}/${id}?api-key=${key}`, body);
    if (res.ok) {
      await redis.set(ID_KEY, id);
      await redis.set(ADDRS_KEY, joined);
      return { ok: true, action: "updated", addresses: addresses.length };
    }
    if (res.status !== 404) {
      return { ok: false, action: "skipped", addresses: addresses.length, reason: `helius_${res.status}` };
    }
    id = null; // The webhook was deleted on Helius; make a new one.
  }

  const res = await call("POST", `${API}?api-key=${key}`, body);
  if (!res.ok) {
    return { ok: false, action: "skipped", addresses: addresses.length, reason: `helius_${res.status}` };
  }
  const created = (await res.json()) as { webhookID?: string };
  if (typeof created.webhookID === "string") await redis.set(ID_KEY, created.webhookID);
  await redis.set(ADDRS_KEY, joined);
  return { ok: true, action: "created", addresses: addresses.length };
}
