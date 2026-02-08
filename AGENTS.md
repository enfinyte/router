# AGENTS.md - LLM Router Monorepo

## Project Overview

Bun monorepo implementing an LLM router API platform. Uses Effect-TS for functional programming patterns with typed errors, dependency injection via services/layers, and schema validation.

**Packages:**
- `api_platform` - HTTP API server (main service)
- `common` - Shared utilities and OpenAI types
- `core` - Core routing logic
- `resolver` - Model resolution logic

## Build, Lint, Test Commands

### Install Dependencies
```bash
bun install                    # Install all workspace dependencies
```

### Run Development Server
```bash
cd packages/api_platform
bun run src/index.ts           # Start the API server
```

### Type Checking
```bash
bunx tsc --noEmit              # Check types across entire repo
bunx tsc --noEmit -p packages/api_platform  # Check specific package
```

### Linting
```bash
bunx oxlint .                  # Lint entire repo
bunx oxlint packages/api_platform  # Lint specific package
```

### Formatting
```bash
bunx oxfmt .                   # Format entire repo
bunx oxfmt --check .           # Check formatting without applying
```

### Generate Types
```bash
cd packages/api_platform
bun run gen:responses-types    # Generate OpenAPI types from openresponses.org
```

### Testing (Bun test runner)
```bash
bun test                       # Run all tests
bun test path/to/file.test.ts  # Run single test file
bun test --watch               # Watch mode
```

## Environment Variables

Required for `api_platform`:
- `API_PLATFORM_PG_CONNECTION` - PostgreSQL connection string (required)
- `API_PLATFORM_PORT` - Server port (default: 8080)
- `API_PLATFORM_LOG_LEVEL` - Log level (default: INFO)

## Code Style Guidelines

### TypeScript Configuration

Strict mode enabled with these key settings:
- `strict: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`
- `noImplicitOverride: true`
- `noFallthroughCasesInSwitch: true`
- `verbatimModuleSyntax: true`

### Path Aliases

Use `@/` or `@/src/` to reference files from package root:
```typescript
import { ResponseResourceSchema } from "@/src/services/responses/schema";
import { DatabaseService } from "@/services/database";
```

### Imports

1. Order imports by: external packages, then internal modules
2. Use named imports, not default exports
3. Use `type` keyword for type-only imports:
```typescript
import { Effect, Schema } from "effect";
import type { ResponseResource } from "./schema";
```

### Effect-TS Patterns

**Generator Functions** - Use `Effect.gen` with `function*` and `yield*`:
```typescript
export const myFunction = (input: Input) =>
  Effect.gen(function* () {
    const config = yield* AppConfig;
    const result = yield* someEffect;
    return result;
  });
```

**Tagged Errors** - Define errors using `Data.TaggedError`:
```typescript
export class MyServiceError extends Data.TaggedError("MyServiceError")<{
  cause?: unknown;
  message?: string;
}> {}
```

**Services (Dependency Injection)** - Use `Context.Tag`:
```typescript
interface MyServiceImpl {
  doSomething: () => Effect.Effect<Result, MyError, never>;
}

export class MyService extends Context.Tag("MyService")<
  MyService,
  MyServiceImpl
>() {}
```

**Layers** - Compose services using `Layer`:
```typescript
export const MyServiceLive = Layer.effect(
  MyService,
  Effect.gen(function* () {
    const dep = yield* SomeDependency;
    return MyService.of({ ... });
  }),
);
```

**Error Handling** - Use `catchTag` or `catchTags`:
```typescript
Effect.catchTags({
  RequestValidationError: (err) =>
    HttpServerResponse.json({ error: err.message }, { status: 400 }),
  Unauthorized: () =>
    HttpServerResponse.text("Unauthorized", { status: 401 }),
});
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables/Functions | camelCase | `createResponseBody`, `validateRequest` |
| Types/Interfaces/Classes | PascalCase | `ResponseResource`, `DatabaseService` |
| Schema definitions | PascalCase + `Schema` suffix | `CreateResponseBodySchema` |
| Error classes | PascalCase + `Error` suffix | `AIServiceError` |
| Constants | SCREAMING_SNAKE_CASE | `DEFAULT_TEMPERATURE`, `RESPONSES_TABLE` |
| API fields (JSON) | snake_case | `created_at`, `tool_choice` |

### Schema Validation (Effect Schema)

Use Effect Schema for request/response validation:
```typescript
const MySchema = Schema.Struct({
  requiredField: Schema.String,
  optionalField: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
});

export type MyType = Schema.Schema.Type<typeof MySchema>;
```

### HTTP Routes (@effect/platform)

```typescript
export const myRouter = HttpRouter.empty.pipe(
  HttpRouter.post("/", Effect.gen(function* () {
    const body = yield* HttpServerRequest.schemaBodyJson(MySchema);
    // ... handle request
    return yield* HttpServerResponse.json(result);
  })),
  HttpRouter.use(myMiddleware()),
);
```

### Database (Kysely)

Use Kysely query builder with typed tables:
```typescript
const row = yield* database.use((conn) =>
  conn.selectFrom(TABLE_NAME)
    .where("id", "==", id)
    .selectAll()
    .executeTakeFirst()
);
```

### Middleware

Create middleware using `HttpMiddleware.make`:
```typescript
export const withValidation = () =>
  HttpMiddleware.make((app) =>
    Effect.gen(function* () {
      const { headers } = yield* HttpServerRequest.HttpServerRequest;
      // validation logic
      return yield* app;
    }),
  );
```

## File Structure Conventions

```
packages/api_platform/
├── src/
│   ├── index.ts           # Entry point, server setup
│   ├── middlewares.ts     # HTTP middleware
│   ├── routes/
│   │   ├── index.ts       # Root router composition
│   │   └── v1/
│   │       ├── index.ts   # v1 router composition  
│   │       └── responses.ts # Route handlers
│   └── services/
│       ├── config.ts      # App configuration service
│       ├── ai/index.ts    # AI service
│       ├── responses/
│       │   ├── schema.ts  # Effect schemas
│       │   └── index.ts   # Service logic
│       └── database/
│           ├── index.ts   # DB service + connection
│           ├── tables.ts  # Table type definitions
│           └── responses/
│               ├── table.ts    # Table schema
│               ├── adapters.ts # DB <-> domain adapters
│               └── index.ts    # DB operations
```

## Do NOT

- Use `any` type or `@ts-ignore`
- Use default exports (use named exports)
- Mix async/await with Effect (use `Effect.promise` or `Effect.tryPromise`)
- Throw raw errors (use `Data.TaggedError`)
- Access services directly (use `yield*` with Context.Tag)
