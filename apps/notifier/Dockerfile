FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV TURBO_TELEMETRY_DISABLED=1
RUN npm install -g pnpm
RUN pnpm install -g turbo@^2
WORKDIR /app

FROM base AS pruned
COPY . .
RUN turbo prune @cfb-picks/notifier --docker

FROM base AS prod-deps
COPY --from=pruned /app/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prefer-offline --frozen-lockfile --prod

FROM base AS builder
COPY --from=pruned /app/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prefer-offline --frozen-lockfile
COPY --from=pruned /app/out/full/ .
RUN turbo build --env-mode loose

#FROM gcr.io/distroless/nodejs22-debian12 AS runner
FROM node:22-slim AS runner
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/packages ./packages

ENV NODE_ENV=production

CMD ["apps/notifier/dist/src/index.js"]
