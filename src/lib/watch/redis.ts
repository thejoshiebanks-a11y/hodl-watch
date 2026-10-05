import { Redis } from "@upstash/redis";

let client: Redis | null = null;

export function getRedis(): Redis {
  if (client) return client;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error("Redis is not configured");
  }
  client = new Redis({ url, token });
  return client;
}
