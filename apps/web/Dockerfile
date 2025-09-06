FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV TURBO_TELEMETRY_DISABLED=1
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install -g pnpm
RUN pnpm install -g turbo@^2
WORKDIR /app

FROM base AS builder
COPY . .
RUN turbo prune @cfb-picks/web --docker

FROM base AS installer
COPY --from=builder /app/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prefer-offline --frozen-lockfile
COPY --from=builder /app/out/full/ .
RUN SKIP_ENV_VALIDATION=1 DATABASE_URL=file:./fake-db-just-for-build.sqlite turbo build --env-mode loose

FROM gcr.io/distroless/nodejs22-debian12 AS runner
WORKDIR /app
COPY --from=installer /app/apps/web/.next/standalone /app
COPY --from=installer /app/apps/web/.next/static /app/apps/web/.next/static
COPY --from=installer /app/apps/web/public /app/apps/web/public
# next standalone build doesn't copy @libsql/linux-arm64-gnu when building a linux/arm64 image for some reason
COPY --from=installer /app/node_modules/@libsql /app/node_modules/@libsql

ENV NODE_ENV=production
EXPOSE 3000

CMD ["apps/web/server.js"]
