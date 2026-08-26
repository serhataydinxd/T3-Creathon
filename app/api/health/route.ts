import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";

function safeDatabaseErrorChain(error: unknown) {
  const chain: Array<{ name?: string; code?: string }> = [];
  const seen = new Set<unknown>();
  let current = error;

  while (current && typeof current === "object" && !seen.has(current) && chain.length < 5) {
    seen.add(current);
    const record = current as { name?: unknown; code?: unknown; cause?: unknown };
    const item: { name?: string; code?: string } = {};
    if (typeof record.name === "string") item.name = record.name;
    if (typeof record.code === "string") item.code = record.code;
    chain.push(item);
    current = record.cause;
  }

  return chain;
}

export async function GET() {
  try {
    await getDb().execute(sql`select 1`);
    return NextResponse.json({ status: "ok", service: "imkan", mode: process.env.APP_MODE ?? "replay", database: "reachable" });
  } catch (error) {
    console.error("Database health probe failed.", safeDatabaseErrorChain(error));
    return NextResponse.json({ status: "unavailable", service: "imkan", database: "unreachable" }, { status: 503 });
  }
}
