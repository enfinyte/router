export const SECRETS_TABLE = "secrets" as const;

export interface SecretsTable {
  userId: string;
  providers: string[] | null;
  disabledProviders: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BackendDatabase {
  [SECRETS_TABLE]: SecretsTable;
}
