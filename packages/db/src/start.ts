import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { migrate } from "./migrate.js";

const entrypoint = process.argv[2];

if (!entrypoint) {
  throw new Error("An application entrypoint is required");
}

await migrate();

const resolvedEntrypoint = resolve(entrypoint);
process.argv.splice(1, 2, resolvedEntrypoint);
await import(pathToFileURL(resolvedEntrypoint).href);
