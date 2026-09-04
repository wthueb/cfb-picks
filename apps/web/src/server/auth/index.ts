import { randomUUID } from "node:crypto";
import type {
  GetServerSideProps,
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from "next";
import { getServerSession } from "next-auth";

import { getLogger, withLogContext } from "@cfb-picks/logging";

import { authConfig } from "./config";

const logger = getLogger("cfb_picks.web.session");

export function auth(
  ...args:
    | [GetServerSidePropsContext["req"], GetServerSidePropsContext["res"]]
    | [NextApiRequest, NextApiResponse]
    | []
) {
  return getServerSession(...args, authConfig);
}

export function withSession(handler?: GetServerSideProps): GetServerSideProps {
  return async (ctx) => {
    const requestIdHeader = ctx.req.headers["x-request-id"];
    const requestId =
      (Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader) ?? randomUUID();
    ctx.res.setHeader("x-request-id", requestId);

    return withLogContext({ request_id: requestId }, async () => {
      const startedAt = Date.now();
      const session = await auth(ctx.req, ctx.res);

      if (!session) {
        logger.info("page authentication redirect", {
          http_url: ctx.resolvedUrl,
          duration_ms: Date.now() - startedAt,
        });
        return {
          redirect: {
            destination: "/api/auth/signin",
            permanent: false,
          },
        };
      }

      return withLogContext(
        { user_id: session.user.id, team_id: session.user.teamId },
        async () => {
          try {
            const res = handler ? await handler(ctx) : null;
            const props = res && "props" in res ? await res.props : {};
            logger.info("authenticated page rendered", {
              http_url: ctx.resolvedUrl,
              duration_ms: Date.now() - startedAt,
            });
            return { ...res, props: { session, ...props } };
          } catch (error) {
            logger.error("authenticated page render failed", {
              http_url: ctx.resolvedUrl,
              duration_ms: Date.now() - startedAt,
              error,
            });
            throw error;
          }
        },
      );
    });
  };
}
