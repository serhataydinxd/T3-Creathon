import { describe, expect, it } from "vitest";
import { resolveDatabaseUrl } from "@/server/db/client";

describe("database configuration", () => {
  it("prefers an explicit database URL", () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: "pglite:memory://" })).toBe(
      "pglite:memory://",
    );
  });

  it("constructs a safely encoded PostgreSQL URL from ECS bindings", () => {
    expect(
      resolveDatabaseUrl({
        DB_HOST: "db.internal",
        DB_PORT: "5432",
        DB_NAME: "imkan staging",
        DB_USER: "imkan@app",
        DB_PASSWORD: "p@ss/word?#",
      }),
    ).toBe(
      "postgresql://imkan%40app:p%40ss%2Fword%3F%23@db.internal:5432/imkan%20staging",
    );
  });

  it("names missing bindings without exposing supplied secrets", () => {
    expect(() => resolveDatabaseUrl({ DB_PASSWORD: "do-not-print" })).toThrow(
      "DB_HOST, DB_NAME, DB_USER",
    );
  });
});
