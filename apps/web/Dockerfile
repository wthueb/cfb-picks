FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
ENV TURBO_TELEMETRY_DISABLED=1
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install -g pnpm@11.22.0
RUN pnpm install -g turbo@2.10.10
WORKDIR /app

FROM base AS builder
COPY . .
RUN turbo prune @cfb-picks/web --docker

FROM base AS installer
COPY --from=builder /app/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/cache pnpm install --store-dir=/pnpm/cache --prefer-offline --frozen-lockfile
COPY --from=builder /app/out/full/ .
RUN PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false SKIP_ENV_VALIDATION=1 DATABASE_URL=file:./fake-db-just-for-build.sqlite turbo build --env-mode loose
RUN mkdir -p apps/web/.next/standalone/node_modules/@cfb-picks \
  && ln -s ../../packages/logging apps/web/.next/standalone/node_modules/@cfb-picks/logging

FROM gcr.io/distroless/nodejs24-debian13 AS runner
WORKDIR /app
COPY --from=installer /app/apps/web/.next/standalone /app
COPY --from=installer /app/apps/web/.next/static /app/apps/web/.next/static
COPY --from=installer /app/apps/web/public /app/apps/web/public
COPY --from=installer /app/packages/db/dist /app/packages/db/dist
COPY --from=installer /app/packages/db/drizzle /app/packages/db/drizzle

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000

CMD ["packages/db/dist/start.js", "apps/web/server.js"]
