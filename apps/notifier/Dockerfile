FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
ENV TURBO_TELEMETRY_DISABLED=1
RUN npm install -g pnpm@11.22.0
RUN pnpm install -g turbo@2.10.10
WORKDIR /app

FROM base AS pruned
COPY . .
RUN turbo prune @cfb-picks/notifier --docker

FROM base AS builder
COPY --from=pruned /app/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/cache pnpm install --store-dir=/pnpm/cache --prefer-offline --frozen-lockfile
COPY --from=pruned /app/out/full/ .
RUN PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false turbo build --env-mode loose
RUN --mount=type=cache,id=pnpm,target=/pnpm/cache pnpm --filter @cfb-picks/notifier --store-dir=/pnpm/cache deploy --prod /app/runtime

FROM gcr.io/distroless/nodejs24-debian13 AS runner
WORKDIR /app
COPY --from=builder /app/runtime /app

ENV NODE_ENV=production

CMD ["node_modules/@cfb-picks/db/dist/start.js", "dist/src/index.js"]
