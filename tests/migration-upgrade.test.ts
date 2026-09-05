import { mkdtempSync, copyFileSync, mkdirSync, readdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Every other database test starts from an empty schema, so nothing here has
 * ever exercised the case that actually happens on deploy: migrating a
 * database that already holds rows written by the previous release.
 *
 * This builds a database at the previous migration, fills it with rows the
 * older code would have written, then applies the current migration folder —
 * the same call the deployed migration task makes.
 */
const MIGRATIONS = "server/db/migrations";

/**
 * A migration folder truncated just before `stopBefore`.
 *
 * Takes the boundary by name rather than "everything but the last", because
 * the interesting upgrade is a specific historical one — the release staging
 * is about to take — and that stops being the last entry as soon as another
 * migration lands.
 */
function migrationFolderBefore(stopBefore: string): string {
  const journal = JSON.parse(readFileSync(join(MIGRATIONS, "meta/_journal.json"), "utf8")) as {
    entries: { idx: number; tag: string }[];
  };
  const cut = journal.entries.findIndex((entry) => entry.tag === stopBefore);
  if (cut < 0) throw new Error(`Unknown migration: ${stopBefore}`);
  const previous = journal.entries.slice(0, cut);
  const dir = mkdtempSync(join(tmpdir(), "imkan-prev-"));
  mkdirSync(join(dir, "meta"));
  for (const entry of previous) copyFileSync(join(MIGRATIONS, `${entry.tag}.sql`), join(dir, `${entry.tag}.sql`));
  for (const name of readdirSync(join(MIGRATIONS, "meta"))) {
    if (name.endsWith("_snapshot.json")) {
      copyFileSync(join(MIGRATIONS, "meta", name), join(dir, "meta", name));
    }
  }
  writeFileSync(join(dir, "meta/_journal.json"), JSON.stringify({ ...journal, entries: previous }));
  return dir;
}

describe("upgrading a database that already has data", () => {
  const client = new PGlite();
  const db = drizzle(client);

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: migrationFolderBefore("0003_nappy_hex") });

    await db.execute(sql`INSERT INTO users (id, email, name, password_hash, role, status)
      VALUES ('11111111-1111-1111-1111-111111111111', 'old@imkan.test', 'Old', 'x', 'content_expert', 'active')`);
    // A genuine curriculum outcome, and a synthetic stand-in for a catalogue
    // topic — the two things the previous release wrote into one table.
    await db.execute(sql`INSERT INTO objectives (id, code, canonical_text, source_url, content_hash, approved)
      VALUES ('22222222-2222-2222-2222-222222222222', 'FB.7.6.2', 'Elektriklenme', 'https://tymm.meb.gov.tr/x', 'hash-real', false)`);
    await db.execute(sql`INSERT INTO objectives (id, code, canonical_text, source_url, content_hash, approved)
      VALUES ('33333333-3333-3333-3333-333333333333', 'BT.technology.12-14', 'Yapay Zeka', 'https://t3bilimturkiye.org/x', 'hash-bt', false)`);
    await db.execute(sql`INSERT INTO generation_runs
      (id, objective_id, requested_by, idempotency_key, request_hash, mode, status, request, objective_snapshot)
      VALUES ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333',
      '11111111-1111-1111-1111-111111111111', 'key-1', 'h1', 'replay', 'ready_for_review', '{}', '{}')`);

    await migrate(db, { migrationsFolder: MIGRATIONS });
  });

  afterAll(async () => {
    await client.close();
  });

  it("applies to a populated database without losing a saved run", async () => {
    const rows = await db.execute(sql`SELECT objective_id, topic_id FROM generation_runs`);
    expect(rows.rows).toHaveLength(1);
    // The old link is untouched; the new column is simply empty for it.
    expect(rows.rows[0].objective_id).toBe("33333333-3333-3333-3333-333333333333");
    expect(rows.rows[0].topic_id).toBeNull();
  });

  it("reclassifies the synthetic rows instead of deleting rows still referenced", async () => {
    const rows = await db.execute(sql`SELECT code, kind FROM objectives ORDER BY code`);
    expect(rows.rows).toEqual([
      { code: "BT.technology.12-14", kind: "legacy_catalogue_topic" },
      { code: "FB.7.6.2", kind: "meb_outcome" },
    ]);
  });

  it("lets a new run reference a topic with no curriculum outcome at all", async () => {
    await db.execute(sql`INSERT INTO topics (id, slug, source, domain_id, cohort, title, source_url)
      VALUES ('55555555-5555-5555-5555-555555555555', 'technology:12-14:yapay-zeka', 'catalogue',
      'technology', '12-14', 'Yapay Zeka', 'https://t3bilimturkiye.org/x')`);
    await db.execute(sql`INSERT INTO generation_runs
      (topic_id, requested_by, idempotency_key, request_hash, mode, status, request, objective_snapshot)
      VALUES ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111',
      'key-2', 'h2', 'replay', 'ready_for_review', '{}', '{}')`);
    const rows = await db.execute(
      sql`SELECT count(*) AS n FROM generation_runs WHERE objective_id IS NULL`,
    );
    expect(Number(rows.rows[0].n)).toBe(1);
  });
});

/**
 * Applies to whichever migration is newest, so every future phase inherits it.
 * Saved packages must keep reading across a deploy, which rules out dropping
 * or renaming anything they depend on.
 */
describe("the newest migration", () => {
  const dir = new URL("../server/db/migrations/", import.meta.url);
  const latest = readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .at(-1)!;
  const sql = readFileSync(new URL(latest, dir), "utf8");

  it("adds rather than removes", () => {
    expect(sql).not.toMatch(/DROP TABLE/i);
    expect(sql).not.toMatch(/DROP COLUMN/i);
    expect(sql).not.toMatch(/DELETE FROM/i);
  });

  it("never makes an existing column mandatory, which would fail on real rows", () => {
    // Adding NOT NULL to a populated column is the classic deploy-breaker.
    expect(sql).not.toMatch(/ALTER COLUMN .* SET NOT NULL/i);
  });
});
