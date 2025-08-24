import type {
  GetServerSideProps,
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from "next";
import { getServerSession } from "next-auth";
import { authConfig } from "./config";

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
    const session = await auth(ctx.req, ctx.res);

    if (!session) {
      return {
        redirect: {
          destination: "/api/auth/signin",
          permanent: false,
        },
      };
    }

    const res = handler ? await handler(ctx) : null;

    const props = res && "props" in res ? await res.props : {};

    return { ...res, props: { session, ...props } };
  };
}
