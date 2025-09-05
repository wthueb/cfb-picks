import { createClient } from "redis";

import { env } from "./env.js";

export const client = createClient({
  url: env.REDIS_URL,
});

await client.connect();
