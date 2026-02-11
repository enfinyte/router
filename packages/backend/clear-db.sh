#!/bin/bash

# only for dev - for quick clean
psql -d "better-auth" <<-SQL
  TRUNCATE TABLE "verification" CASCADE;
  TRUNCATE TABLE "account" CASCADE;
  TRUNCATE TABLE "session" CASCADE;
  TRUNCATE TABLE "user" CASCADE;
SQL

echo "All tables have been truncated."
