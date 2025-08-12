import createClient from "openapi-fetch";

import type { paths } from "./schema";

export const client = createClient<paths>({
  baseUrl: "https://api.collegefootballdata.com",
  headers: {
    Authorization: `Bearer ${process.env.CFB_API_KEY}`,
  },
});
