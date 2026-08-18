import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "redis";

import { env } from "./env.js";

const developmentCacheKey = /^cfb-(games|lines|calendar)-\d+$/;
const developmentDataDirectories = [
  resolve(process.cwd(), "packages/cfbd/test-data"),
  resolve(process.cwd(), "../../packages/cfbd/test-data"),
];

let client: ReturnType<typeof createClient> | undefined;

if (env.NODE_ENV === "production") {
  client = createClient({
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
}

function getClient() {
  if (!client) throw new Error("Redis is unavailable outside production");
  return client;
}

export async function getCached(key: string) {
  if (env.NODE_ENV === "development") {
    if (!developmentCacheKey.test(key)) {
      throw new Error(`Invalid development CFBD cache key: ${key}`);
    }

    for (const directory of developmentDataDirectories) {
      try {
        return await readFile(resolve(directory, `${key}.json`), "utf8");
      } catch (cause) {
        if (
          typeof cause !== "object" ||
          cause === null ||
          !("code" in cause) ||
          cause.code !== "ENOENT"
        ) {
          throw new Error(`Unable to read development CFBD fixture for ${key}`, { cause });
        }
      }
    }

    throw new Error(`Development CFBD fixture not found for ${key}`);
  }

  return await getClient().get(key);
}

export async function setCached(key: string, value: string, ttlSeconds: number) {
  await getClient().set(key, value, {
    expiration: {
      type: "EX",
      value: ttlSeconds,
    },
  });
}
