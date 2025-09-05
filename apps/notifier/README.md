# Notifier App - Transpilation and Docker Setup

This document describes how to build and run the notifier app as transpiled JavaScript in a Docker container.

## Overview

The notifier app and its internal dependencies have been set up to transpile TypeScript to JavaScript for production deployment. The setup includes:

- **TypeScript to JavaScript transpilation** for the notifier app and all internal packages
- **Docker containerization** for easy deployment
- **Build scripts** for streamlined development workflow

## Built Components

The following components are transpiled to JavaScript:

- `@cfb-picks/notifier` - The main notifier application
- `@cfb-picks/cfbd` - CFB data API package  
- `@cfb-picks/db` - Database access package
- `@cfb-picks/lib` - Shared utilities package

## Building for Production

### Prerequisites

- Node.js >= 22.14.0
- pnpm >= 9.6.0

### Quick Build

Use the provided build script:

```bash
./build-notifier.sh
```

This will:
1. Build all internal package dependencies 
2. Build the notifier app
3. Output JavaScript files to respective `dist/` directories

### Manual Build

```bash
# Set environment variable to skip validation
export SKIP_ENV_VALIDATION=1

# Build dependencies first
pnpm --filter @cfb-picks/notifier^... build

# Build the notifier app
pnpm --filter @cfb-picks/notifier build
```

### Build Output

After building, you'll find JavaScript files in:

- `packages/cfbd/dist/` - CFB data API JavaScript files
- `packages/db/dist/` - Database access JavaScript files  
- `packages/lib/dist/` - Utility JavaScript files
- `apps/notifier/dist/` - Main notifier app JavaScript files

## Docker Deployment

### Building the Docker Image

After running the build script, create the Docker image:

```bash
docker build -f apps/notifier/Dockerfile -t cfb-picks-notifier .
```

### Running the Container

```bash
docker run --env-file .env cfb-picks-notifier
```

**Note:** Make sure your `.env` file contains all required environment variables:
- Database configuration
- SMTP settings
- CFB API keys

### Docker Image Details

The Dockerfile uses a multi-stage approach:
- **Production image**: Minimal Alpine Linux with Node.js 22
- **Runtime dependencies**: Only production npm packages
- **Application files**: Pre-built JavaScript files copied from host

## Configuration

### TypeScript Configuration

The notifier app uses a modified `tsconfig.json` that:
- Extends the base workspace configuration
- Emits JavaScript files to `dist/` directory
- Uses ES2022 modules with Bundler module resolution
- Includes JSX support for React Email templates

### Internal Package Configuration

Internal packages (`@cfb-picks/cfbd`, `@cfb-picks/db`, `@cfb-picks/lib`) use:
- Updated TypeScript configuration that emits both `.js` and `.d.ts` files
- ES2022 target and module format for modern Node.js compatibility

## Development Workflow

1. **Make changes** to TypeScript source files
2. **Run build** using `./build-notifier.sh` 
3. **Test locally** with `node apps/notifier/dist/src/index.js`
4. **Build Docker image** if needed for deployment
5. **Deploy container** to production environment

## Troubleshooting

### Build Issues

- Ensure all dependencies are installed: `pnpm install`
- Check Node.js version matches requirements (>= 22.14.0)  
- Set `SKIP_ENV_VALIDATION=1` if environment variables are not available during build

### Docker Issues

- Verify all JavaScript files are built before creating Docker image
- Check that `.env` file contains all required environment variables
- Ensure Docker has sufficient resources for the build process

### Runtime Issues

- Check that all database and SMTP configurations are correct
- Verify network connectivity to external services (CFB API, SMTP server)
- Review Docker container logs for specific error messages