import type { Kysely } from "kysely";
import { RESPONSES_TABLE, ResponsesTableDefinition, type ResponsesTable } from "./responses/table";

export interface ApiPlatformDatabase {
  [RESPONSES_TABLE]: ResponsesTable;
}

export const TABLE_DEFINITIONS: Record<keyof ApiPlatformDatabase, TableDefinition> = {
  [RESPONSES_TABLE]: ResponsesTableDefinition,
};

export interface TableDefinition {
  create: (db: Kysely<ApiPlatformDatabase>) => Promise<void>;
}
