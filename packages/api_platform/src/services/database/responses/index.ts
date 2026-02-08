import { Effect } from "effect";
import { DatabaseService, DatabaseServiceError } from "..";
import { RESPONSES_TABLE } from "./table";
import type { ResponseResource } from "@/src/services/responses/schema";
import {
  adaptResponsesResourcefromResponsesTable,
  convertResponsesResourcetoResponsesTable,
} from "./adapters";

export const createResponsesResource = (responses: ResponseResource) =>
  Effect.gen(function* () {
    const database = yield* DatabaseService;
    const adaptedResponsesResource = yield* convertResponsesResourcetoResponsesTable(responses);
    const result = yield* database.use((conn) =>
      conn
        .insertInto(RESPONSES_TABLE)
        .values(adaptedResponsesResource)
        .returningAll()
        .executeTakeFirst(),
    );

    if (!result)
      throw new DatabaseServiceError({
        cause: "EMPTY_ROW_RETURNED_AFTER_INSERTION",
        message:
          "was expecting the whole row that was inserted to be returned, but received an empty row",
      });

    return responses;
  });

export const updateResponsesResource = (responses: ResponseResource) =>
  Effect.gen(function* () {
    const database = yield* DatabaseService;
    const adaptedResponseResource = yield* convertResponsesResourcetoResponsesTable(responses);

    const row = yield* database.use((conn) =>
      conn
        .updateTable(RESPONSES_TABLE)
        .set(adaptedResponseResource)
        .returningAll()
        .executeTakeFirst(),
    );

    return row ? yield* adaptResponsesResourcefromResponsesTable(row) : null;
  });

export const getResponsesResourceById = (responseId: ResponseResource["id"]) =>
  Effect.gen(function* () {
    const database = yield* DatabaseService;

    const row = yield* database.use((conn) =>
      conn.selectFrom(RESPONSES_TABLE).where("id", "==", responseId).selectAll().executeTakeFirst(),
    );

    return row ? yield* adaptResponsesResourcefromResponsesTable(row) : null;
  });
