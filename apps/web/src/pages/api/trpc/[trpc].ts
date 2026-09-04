import { randomUUID } from "node:crypto";
import type { NextApiRequest, NextApiResponse } from "@trpc/server/adapters/next";
import { createNextApiHandler } from "@trpc/server/adapters/next";

import { getLogger, withLogContext } from "@cfb-picks/logging";

import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

const logger = getLogger("cfb_picks.web.api");

const trpcHandler = createNextApiHandler({
  router: appRouter,
  createContext: createTRPCContext,
  onError: ({ path, error, type }) => {
    logger.error("trpc request error", {
      procedure: path,
      procedure_type: type,
      error_code: error.code,
      error,
    });
  },
});

function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestIdHeader = req.headers["x-request-id"];
  const requestId =
    (Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader) ?? randomUUID();
  const startedAt = Date.now();

  req.headers["x-request-id"] = requestId;
  res.setHeader("x-request-id", requestId);

  return withLogContext({ request_id: requestId }, () => {
    logger.debug("http request received", {
      http_method: req.method,
      http_url: req.url,
    });

    res.once("finish", () => {
      const fields = {
        http_method: req.method,
        http_url: req.url,
        status_code: res.statusCode,
        duration_ms: Date.now() - startedAt,
      };

      if (res.statusCode >= 500) {
        logger.error("http request completed", fields);
      } else if (res.statusCode >= 400) {
        logger.warning("http request completed", fields);
      } else {
        logger.info("http request completed", fields);
      }
    });

    return trpcHandler(req, res) as Promise<void>;
  });
}

export default handler;
