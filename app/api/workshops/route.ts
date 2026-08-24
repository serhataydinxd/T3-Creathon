import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { createDraft } from "@/server/domain/workshops";
import { resourceProfileSchema } from "@/server/domain/schemas";
import { isSameOrigin, readBoundedJson } from "@/server/http/request";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  if (!(["content_expert", "pedagogue"] as const).includes(user.role as "content_expert" | "pedagogue")) {
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 });
  }
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Kaynak doğrulanamadı." }, { status: 403 });
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey || idempotencyKey.length > 100) {
    return NextResponse.json({ error: "Geçerli bir idempotency-key gerekli." }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await readBoundedJson(request);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message === "BODY_TOO_LARGE" ? "İstek gövdesi çok büyük." : "Geçersiz JSON gövdesi." }, { status: error instanceof Error && error.message === "BODY_TOO_LARGE" ? 413 : 400 });
  }
  const parsed = resourceProfileSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz atölye koşulları." }, { status: 400 });
  try {
    const id = await createDraft(user, parsed.data, idempotencyKey);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "PLAN_BLOCKED") return NextResponse.json({ error: "Bloker bulguları olan plan kaydedilemez." }, { status: 422 });
    if (message === "IDEMPOTENCY_KEY_REUSED") return NextResponse.json({ error: "Idempotency anahtarı farklı bir istekle daha önce kullanıldı." }, { status: 409 });
    return NextResponse.json({ error: "Taslak kaydedilemedi." }, { status: 500 });
  }
}
