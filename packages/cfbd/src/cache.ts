import { createClient } from "redis";

import { env } from "./env.js";

export const client = createClient({
  url: env.REDIS_URL,
  socket: {
    reconnectStrategy: () => 1000,
  },
});

client.on("error", (err) => console.error("Redis error:", err));
client.on("connect", () => console.log("Redis connecting..."));
client.on("ready", () => console.log("Redis reporting ready"));
client.on("end", () => console.warn("Redis connection closed"));
client.on("reconnecting", () => console.log("Redis reconnecting..."));

await client.connect();
