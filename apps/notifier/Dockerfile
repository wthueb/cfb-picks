# Use Node.js LTS version that matches the engine requirement  
FROM node:22-alpine

# Set the working directory
WORKDIR /app

# Copy package.json files first for better Docker layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/notifier/package.json ./apps/notifier/
COPY packages/cfbd/package.json ./packages/cfbd/
COPY packages/db/package.json ./packages/db/
COPY packages/lib/package.json ./packages/lib/

# Install pnpm and dependencies
# Note: In production, you might need to handle SSL certificates or use a private registry
RUN npm install -g pnpm@10.11.1 && \
    pnpm install --frozen-lockfile --prod

# Copy the pre-built JavaScript files
# These should be built on the host or in a previous CI step
COPY packages/cfbd/dist ./packages/cfbd/dist/
COPY packages/db/dist ./packages/db/dist/
COPY packages/lib/dist ./packages/lib/dist/
COPY apps/notifier/dist ./apps/notifier/dist/

# Copy other runtime files needed by the notifier
COPY apps/notifier/emails ./apps/notifier/emails/

# Set the working directory to the notifier app
WORKDIR /app/apps/notifier

# Set environment variables
ENV NODE_ENV=production

# Run the notifier application
CMD ["node", "dist/src/index.js"]