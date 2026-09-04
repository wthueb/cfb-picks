import z from "zod";

import { getLogger } from "@cfb-picks/logging";

import { env } from "./env.js";
import { migrate } from "./migrate.js";
import { seedDevelopmentDatabase } from "./seed.js";

if (env.NODE_ENV === "production") {
  throw new Error("Development data cannot be seeded in production");
}

const logger = getLogger("cfb_picks.db.seed_cli");
const season = z.coerce.number().int().min(2000).parse(process.env.SEASON);

await migrate();
await seedDevelopmentDatabase(season);

logger.info("development data seeded", { season });
