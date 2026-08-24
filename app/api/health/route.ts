import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";

export async function GET() {
  try {
    await getDb().execute(sql`select 1`);
    return NextResponse.json({ status: "ok", service: "imkan", mode: process.env.APP_MODE ?? "replay", database: "reachable" });
  } catch {
    return NextResponse.json({ status: "unavailable", service: "imkan", database: "unreachable" }, { status: 503 });
  }
}
