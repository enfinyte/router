create table "secrets" (
    "userId" text not null primary key references "user" ("id") on delete cascade,
    "providers" text [],
    "disabledProviders" text [],
    "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
    "updatedAt" timestamptz default CURRENT_TIMESTAMP not null
);

create index "secrets_userId_idx" on "secrets" ("userId");
