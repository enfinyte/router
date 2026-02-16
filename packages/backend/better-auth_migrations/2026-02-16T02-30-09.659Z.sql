create table "apikey" ("id" text not null primary key, "name" text, "start" text, "prefix" text, "key" text not null, "userId" text not null references "user" ("id") on delete cascade, "refillInterval" integer, "refillAmount" integer, "lastRefillAt" timestamptz, "enabled" boolean, "rateLimitEnabled" boolean, "rateLimitTimeWindow" integer, "rateLimitMax" integer, "requestCount" integer, "remaining" integer, "lastRequest" timestamptz, "expiresAt" timestamptz, "createdAt" timestamptz not null, "updatedAt" timestamptz not null, "permissions" text, "metadata" text);

create index "apikey_key_idx" on "apikey" ("key");

create index "apikey_userId_idx" on "apikey" ("userId");
