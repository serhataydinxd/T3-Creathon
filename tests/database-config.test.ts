import { describe, expect, it, vi } from "vitest";
import { resolveDatabaseSsl, resolveDatabaseUrl } from "@/server/db/client";

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

describe("resolveDatabaseSsl", () => {
  it("requires an explicit CA when TLS is enabled", () => {
    expect(() => resolveDatabaseSsl({ DATABASE_SSL: "true" })).toThrow(
      "DATABASE_CA_CERT is required",
    );
  });

  it("loads the configured CA and keeps certificate verification enabled", () => {
    const readCertificate = vi.fn(() => "test-rds-ca");

    expect(
      resolveDatabaseSsl(
        { DATABASE_SSL: "true", DATABASE_CA_CERT: "/app/certs/rds.pem" },
        readCertificate,
      ),
    ).toEqual({ ca: "test-rds-ca", rejectUnauthorized: true });
    expect(readCertificate).toHaveBeenCalledWith("/app/certs/rds.pem", "utf8");
  });

  it("does not load a CA when TLS is disabled", () => {
    const readCertificate = vi.fn(() => "unused");

    expect(resolveDatabaseSsl({}, readCertificate)).toBeUndefined();
    expect(readCertificate).not.toHaveBeenCalled();
  });
});
