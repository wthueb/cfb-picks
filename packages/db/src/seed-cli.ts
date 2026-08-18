import z from "zod";

import { env } from "./env.js";
import { migrate } from "./migrate.js";
import { seedDevelopmentDatabase } from "./seed.js";

if (env.NODE_ENV === "production") {
  throw new Error("Development data cannot be seeded in production");
}

const season = z.coerce.number().int().min(2000).parse(process.env.SEASON);

await migrate();
await seedDevelopmentDatabase(season);

console.log(`Seeded development data for the ${season} season`);
