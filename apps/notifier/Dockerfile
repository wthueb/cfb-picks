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

FROM base AS prod-deps
COPY --from=pruned /app/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/cache pnpm install --store-dir=/pnpm/cache --prefer-offline --frozen-lockfile --prod

FROM base AS builder
COPY --from=pruned /app/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/cache pnpm install --store-dir=/pnpm/cache --prefer-offline --frozen-lockfile
COPY --from=pruned /app/out/full/ .
RUN PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false turbo build --env-mode loose

#FROM gcr.io/distroless/nodejs24-debian13 AS runner
FROM node:24-slim AS runner
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/packages ./packages

ENV NODE_ENV=production

CMD ["packages/db/dist/start.js", "apps/notifier/dist/src/index.js"]
