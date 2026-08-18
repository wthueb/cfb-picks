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
RUN --mount=type=cache,id=pnpm,target=/pnpm/cache pnpm --filter @cfb-picks/web --store-dir=/pnpm/cache deploy --prod /app/runtime

FROM gcr.io/distroless/nodejs24-debian13 AS runner
WORKDIR /app
COPY --from=installer /app/runtime /app

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node_modules/@cfb-picks/db/dist/start.js", "node_modules/next/dist/bin/next", "start"]
