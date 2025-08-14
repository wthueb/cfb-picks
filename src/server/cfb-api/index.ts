import createClient from "openapi-fetch";

import { env } from "~/env";

import type { paths } from "./schema";

export const client = createClient<paths>({
  baseUrl: "https://api.collegefootballdata.com",
  headers: {
    Authorization: `Bearer ${env.CFB_API_KEY}`,
  },
});
