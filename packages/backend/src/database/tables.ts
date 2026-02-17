export const SECRETS_TABLE = "secret" as const;
export const USER_TABLE = "user" as const;

export interface SecretsTable {
  userId: string;
  providers: string[] | null;
  disabledProviders: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserTable {
  id: string;
  fallbackProviderModelPair: string | null;
  analysisTarget: string | null;
}

export interface BackendDatabase {
  [SECRETS_TABLE]: SecretsTable;
  [USER_TABLE]: UserTable;
}
