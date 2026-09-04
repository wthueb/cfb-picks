import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "redis";

import { getLogger } from "@cfb-picks/logging";

import { env } from "./env.js";

const logger = getLogger("cfb_picks.cfbd.cache");

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

  client.on("error", (error) => logger.error("redis client error", { error }));
  client.on("connect", () => logger.info("redis connection started"));
  client.on("ready", () => logger.info("redis connection ready"));
  client.on("end", () => logger.warning("redis connection closed"));
  client.on("reconnecting", () => logger.warning("redis reconnecting"));

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
      const path = resolve(directory, `${key}.json`);
      try {
        const value = await readFile(path, "utf8");
        logger.debug("cfbd fixture cache hit", { cache_key: key, path });
        return value;
      } catch (cause) {
        if (
          typeof cause !== "object" ||
          cause === null ||
          !("code" in cause) ||
          cause.code !== "ENOENT"
        ) {
          logger.error("cfbd fixture cache read failed", { cache_key: key, path, error: cause });
          throw new Error(`Unable to read development CFBD fixture for ${key}`, { cause });
        }
      }
    }

    logger.error("cfbd fixture cache miss", { cache_key: key });
    throw new Error(`Development CFBD fixture not found for ${key}`);
  }

  const value = await getClient().get(key);
  if (value === null) {
    logger.debug("cfbd cache miss", { cache_key: key });
  } else {
    logger.debug("cfbd cache hit", { cache_key: key });
  }
  return value;
}

export async function setCached(key: string, value: string, ttlSeconds: number) {
  await getClient().set(key, value, {
    expiration: {
      type: "EX",
      value: ttlSeconds,
    },
  });
  logger.debug("cfbd cache entry stored", { cache_key: key, ttl_seconds: ttlSeconds });
}
