FROM oven/bun:1 AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/api_platform/package.json packages/api_platform/
COPY packages/backend/package.json packages/backend/
COPY packages/common/package.json packages/common/
COPY packages/config/package.json packages/config/
COPY packages/resolver/package.json packages/resolver/
COPY packages/vault/package.json packages/vault/
COPY packages/ledger/package.json packages/ledger/
COPY packages/frontend/package.json packages/frontend/

RUN bun install --frozen-lockfile

FROM oven/bun:1 AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV DOCKER_BUILD=true
RUN bun build --compile ./index.ts --outfile ./router

ARG NEXT_PUBLIC_BETTERAUTH_BASE_URL
ENV NEXT_PUBLIC_BETTERAUTH_BASE_URL=$NEXT_PUBLIC_BETTERAUTH_BASE_URL
ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL

ENV NEXT_TELEMETRY_DISABLED=1

RUN bun run --cwd packages/frontend build

FROM oven/bun:1-slim AS runtime
WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/bun.lock ./
COPY --from=build /app/packages/api_platform/package.json packages/api_platform/
COPY --from=build /app/packages/backend/package.json packages/backend/
COPY --from=build /app/packages/common/package.json packages/common/
COPY --from=build /app/packages/config/package.json packages/config/
COPY --from=build /app/packages/resolver/package.json packages/resolver/
COPY --from=build /app/packages/vault/package.json packages/vault/
COPY --from=build /app/packages/ledger/package.json packages/ledger/
COPY --from=build /app/packages/frontend/package.json packages/frontend/

RUN bun install --frozen-lockfile --production

COPY --from=build /app/tsconfig.json ./
COPY --from=build /app/packages/api_platform/src packages/api_platform/src
COPY --from=build /app/packages/backend/src packages/backend/src
COPY --from=build /app/packages/common/src packages/common/src
COPY --from=build /app/packages/config/src packages/config/src
COPY --from=build /app/packages/resolver/src packages/resolver/src
COPY --from=build /app/packages/vault/src packages/vault/src
COPY --from=build /app/packages/ledger/src packages/ledger/src

COPY --from=build /app/packages/frontend/.next/standalone packages/frontend/.next/standalone
COPY --from=build /app/packages/frontend/.next/static packages/frontend/.next/standalone/packages/frontend/.next/static
COPY --from=build /app/packages/frontend/public packages/frontend/.next/standalone/packages/frontend/public

COPY --from=build /app/router ./

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

EXPOSE 8080 8000 3000

CMD ["./router"]
