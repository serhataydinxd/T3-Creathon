import { NextResponse } from "next/server";
import { generateWorkshop } from "@/server/domain/generator";
import { resourceProfileSchema } from "@/server/domain/schemas";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16_384) {
    return NextResponse.json({ error: "İstek gövdesi çok büyük." }, { status: 413 });
  }
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > 16_384) {
    return NextResponse.json({ error: "İstek gövdesi çok büyük." }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON gövdesi." }, { status: 400 });
  }
  const parsed = resourceProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz atölye koşulları", findings: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(generateWorkshop(parsed.data));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Atölye üretilemedi." },
      { status: 422 },
    );
  }
}
