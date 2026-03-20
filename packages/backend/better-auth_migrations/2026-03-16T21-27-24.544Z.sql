create table "secret" ("id" text not null primary key, "userId" text not null references "user" ("id") on delete cascade, "providers" jsonb, "disabledProviders" jsonb, "createdAt" timestamptz not null, "updatedAt" timestamptz not null);

create index "secret_userId_idx" on "secret" ("userId");