import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", service: "imkan", mode: process.env.APP_MODE ?? "replay" });
}
