import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { getLogger } from "@cfb-picks/logging";

import { migrate } from "./migrate.js";

const logger = getLogger("cfb_picks.db.start");

const entrypoint = process.argv[2];

if (!entrypoint) {
  throw new Error("An application entrypoint is required");
}

await migrate();

const resolvedEntrypoint = resolve(entrypoint);
logger.info("application entrypoint starting", { entrypoint: resolvedEntrypoint });
process.argv.splice(1, 2, resolvedEntrypoint);
try {
  await import(pathToFileURL(resolvedEntrypoint).href);
} catch (error) {
  logger.critical("application entrypoint failed", { entrypoint: resolvedEntrypoint, error });
  throw error;
}
