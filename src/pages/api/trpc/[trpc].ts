import {
  createNextApiHandler,
  type NextApiRequest,
  type NextApiResponse,
} from "@trpc/server/adapters/next";

import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

const trpcHandler = createNextApiHandler({
  router: appRouter,
  createContext: createTRPCContext,
  onError:
    env.NODE_ENV === "development"
      ? ({ path, error }) => {
          console.error(`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`);
        }
      : undefined,
});

// export API handler
function handler(req: NextApiRequest, res: NextApiResponse) {
  return trpcHandler(req, res) as Promise<void>;
}

export default handler;
