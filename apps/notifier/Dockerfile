FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV TURBO_TELEMETRY_DISABLED=1
RUN npm install -g pnpm
RUN pnpm install -g turbo@^2
WORKDIR /app

FROM base AS builder
COPY . .
RUN turbo prune @cfb-picks/notifier --docker

FROM base AS installer
COPY --from=builder /app/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prefer-offline --frozen-lockfile
COPY --from=builder /app/out/full/ .
RUN turbo build --env-mode loose

FROM gcr.io/distroless/nodejs20-debian12 AS runner
WORKDIR /app
COPY --from=installer /app .

ENV NODE_ENV=production

CMD ["apps/notifier/dist/src/index.js"]
