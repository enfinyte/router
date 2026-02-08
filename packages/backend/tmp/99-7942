import { Pool } from "pg";

class DatabasePool {
  private static instance: Pool;

  private constructor() {}

  public static getInstance(): Pool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new Pool({
        connectionString: process.env.POSTGRES_CONNECTION_STRING as string,
      });
    }
    return DatabasePool.instance;
  }
}

export const pool = DatabasePool.getInstance();
