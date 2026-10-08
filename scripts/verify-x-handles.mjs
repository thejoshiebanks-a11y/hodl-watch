/* eslint-disable */
// One-off check: do these handles belong to who you think they do?
// Usage: node --env-file=.env.local scripts/verify-x-handles.mjs handle1 handle2 ...
// Cost: X bills about $0.01 per user looked up.
const bearer = process.env.X_BEARER_TOKEN;
const handles = process.argv.slice(2).map((h) => h.replace(/^@/, "")).filter(Boolean);
if (!bearer) {
  console.error("X_BEARER_TOKEN is missing. Add it to .env.local first.");
  process.exit(1);
}
if (handles.length === 0 || handles.length > 100) {
  console.error("Give between 1 and 100 handles.");
  process.exit(1);
}
const url = `https://api.x.com/2/users/by?usernames=${handles.join(",")}&user.fields=name,verified,public_metrics,description`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${bearer}` } });
if (!res.ok) {
  console.error(`X answered ${res.status}:`, (await res.text()).slice(0, 300));
  process.exit(1);
}
const body = await res.json();
for (const u of body.data ?? []) {
  const f = u.public_metrics?.followers_count;
  console.log(`@${u.username}  |  ${u.name}  |  ${f?.toLocaleString("en-US") ?? "?"} followers`);
  if (u.description) console.log(`   ${u.description.replace(/\s+/g, " ").slice(0, 110)}`);
}
for (const e of body.errors ?? []) console.log(`NOT FOUND: ${e.value ?? e.detail}`);
