import { createClient } from "redis";

import { env } from "./env";

export const client = createClient({
  url: env.REDIS_URL,
});

await client.connect();
