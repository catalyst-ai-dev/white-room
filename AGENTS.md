# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Requirements

- Node 22.9.0
- Postgres 16

### Running the Application

```bash
npm start                                # Start all services (API, web, lambda dev server)
nx serve api                             # Start API only
nx serve web                             # Start web only
```

### Testing, Linting, and Building

```bash
# Single package
nx test [packageName]
nx lint [packageName]
nx build [packageName]

# Run specific test files or patterns
nx test api --testPathPattern=user          # Run tests matching "user" in api project
nx test domain --testPathPattern=service    # Run tests matching "service" in domain project

# All packages
npm run test        # nx run-many --target=test --all
npm run lint        # nx run-many --target=lint --all
npm run build       # nx run-many --target=build --all

# Pre-commit checks (affected files only)
npm run pre-commit  # nx affected --target=lint,test --base=origin/main
```

### Dependency Graph

```bash
nx graph            # Show workspace graph and available tasks
```

### Creating New Packages

```bash
# Create new library
nx generate @nx/node:library lib/my-new-lib

# Create new module (app/lambda)
nx generate @nx/node:app lambdas/my-lambda-function
```

## Architecture

### Monorepo Structure

This is an Nx-based TypeScript monorepo divided into:

- **`/core`**: Core application packages
  - `api`: Fastify REST API with auto-loaded plugins and controllers
  - `domain`: TypeORM domain models, services, and repositories (DDD architecture)
  - `web`: React web application

- **`/lib`**: Shared libraries imported via path aliases (e.g., `@namespace/util`, `@namespace/logger`)

- **`/infra`**: Infrastructure and tooling
  - `cdk`: AWS CDK infrastructure definitions (generates CloudFormation)
  - `lambda-backend`: Lambda development server
  - `migrations`: Database migrations and seeding

- **`/lambdas`**: AWS Lambda functions
  - Each lambda has its own directory with `src/main.ts` handler
  - `/lambdas/scrapers`: Playwright-based scrapers (also deployed as Lambdas)

### Domain-Driven Design Architecture

The `/core/domain` module uses a layered DDD approach:

1. **Domain Models** (`*.model.ts`): TypeORM entities with business logic methods
2. **Repositories** (`*.repository.ts`): Data access layer, extending TypeORM repositories
3. **Services** (`*.service.ts`): Business logic orchestration, coordinating models and repositories
4. **Schemas** (`*.schemas.ts`): Zod schemas for DTOs and validation
5. **Errors** (`*.errors.ts`): Domain-specific error classes
6. **Events** (`*.events.ts`): Domain events for cross-domain communication

The `DomainModule` (core/domain/src/domain.module.ts) serves as the orchestrator, instantiating all domain services and wiring dependencies. It requires a TypeORM DataSource and an optional EventBus.

Example domain modules: `address`, `user`, `lambda`, `dataTable`, `auth`

### API Architecture

The Fastify API (`/core/api`) follows these patterns:

- **Auto-loading**: Plugins and controllers are auto-loaded from their directories
- **Controllers** (`src/controllers/*.controller.ts`): Define routes and request handlers
- **Plugins** (`src/plugins/*.ts`): Fastify plugins for cross-cutting concerns (error handling, Swagger, etc.)
- **Domain Decoration**: `DomainModule` is decorated on the Fastify instance for access in routes
- **AppFactory**: Factory pattern for creating configured server instances

### Lambda Architecture

Lambda functions use the `@namespace/lambda-handler` wrapper:

- **Handler Pattern**: Type-safe handlers with Zod input validation
- **Structure**: `main.ts` exports handler, logic lives in separate files
- **Return Values**: Return business data, not HTTP/Lambda-specific responses
- **Configuration**: Lambda settings (memory, timeout, environment) defined in `@namespace/lambda/lambda.settings.ts`
- **Scrapers**: Special lambda category using Playwright for browser automation

### Infrastructure as Code

AWS CDK code (`/infra/cdk`) defines all infrastructure:

- **Stack Organization**: Separate stacks for VPC, API, Frontend, and Lambdas
- **Environment-based**: Supports dev/staging/prod environments
- **Main Entry**: `bin/main.ts` orchestrates stack creation via `processCdkApp()`
- **Deployment**: Automated via GitHub Actions on push to `dev`/`staging`/`prod` branches

### Bundling and Dependencies

- **Nx Bundling**: Compiled output includes generated `package.json` with only required dependencies
- **Local Libraries**: Lib codes are bundled into final output (no separate publishing needed)
- **No Manual Dependencies**: Nx automatically manages `node_modules` for each package

## Coding Standards

### Import Order (CRITICAL)

Imports must follow this exact order:

1. Type imports - External modules
2. Type imports - Local module aliases
3. Type imports - Relative (ordered by distance)
4. Regular imports - External modules
5. Regular imports - Local module aliases
6. Regular imports - Relative (ordered by distance)

```typescript
// Example:
import type { FastifyRequest } from 'fastify';
import type { Logger } from '@namespace/logger';
import type { UserDto } from '../../dtos';

import { z } from 'zod';
import { logger } from '@namespace/logger';
import { userService } from './services';
```

### TypeScript Standards

- **No `any` types** - Use precise types always
- **Strict mode** enabled
- **Naming**:
  - Classes/Interfaces: PascalCase
  - Variables/Functions: camelCase
  - Constants/Enums: UPPER_SNAKE_CASE
  - Booleans: prefix with `is`, `has`, `should`
  - Private members: prefix with `_`
- **Functions**: "get" functions should throw errors if entity not found
- **Error Handling**: Extend from custom Error classes, descriptive messages
- **Comments**: JSDoc for public APIs, inline for complex logic

### Domain Service Patterns

When implementing domain services:

- Methods are async by default
- "get" methods (like `getById`) throw domain-specific errors when not found
- Services emit domain events via EventBus
- DTOs are validated with Zod schemas
- Dependencies injected via constructor
- Instantiated by `DomainModule`

### Testing

- Test files adjacent to source: `file.ts` → `file.spec.ts`
- Use Arrange-Act-Assert pattern
- Domain tests in `/core/domain/test`
- Integration tests marked `.skip` by default

## Configuration

- **TypeScript/Jest/ESLint**: Use root configs unless absolutely necessary
- **Bundler**: Prefer `esbuild` (use different bundler only if decorators needed)
- **Environment Variables**: Configure in root `.env` (based on `.env.default`)

## Deployment

Push to `dev`/`staging`/`prod` branches triggers:

1. CI builds the application
2. CDK synthesizes CloudFormation stacks
3. Automated deployment to corresponding AWS environment

## Path Aliases

Library imports use TypeScript path aliases defined in `tsconfig.base.json`:

- `@api/*` → `/core/api/src/*`
- `@domain` → `/core/domain/src/domain.module.ts`
- `@domain/*` → `/core/domain/src/*`
- `@web/*` → `/core/web/src/*`
- `@namespace/*` → `/lib/*/src/index.ts`

## Development Workflow

When implementing core features, follow this order:

1. Analyze/create domain models in `/core/domain/src/{domain}/*.model.ts`
2. Update Zod schemas in `*.schemas.ts`
3. Implement/update service methods in `*.service.ts`
4. Create/update domain-specific errors in `*.errors.ts`
5. Write/update unit tests in `/core/domain/test`
6. Expose via API if needed in `/core/api/src/controllers`
