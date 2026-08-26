import { NextResponse } from "next/server";
import { generateWorkshopPlan } from "@/server/ai/generate";
import { resourceProfileSchema } from "@/server/domain/schemas";
import { getCurrentUser } from "@/server/auth/session";
import { isSameOrigin, readBoundedJson } from "@/server/http/request";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  if (user.role !== "content_expert" && user.role !== "pedagogue") return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Kaynak doğrulanamadı." }, { status: 403 });
  let body: unknown;
  try {
    body = await readBoundedJson(request);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message === "BODY_TOO_LARGE" ? "İstek gövdesi çok büyük." : "Geçersiz JSON gövdesi." }, { status: error instanceof Error && error.message === "BODY_TOO_LARGE" ? 413 : 400 });
  }
  const parsed = resourceProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz atölye koşulları", findings: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await generateWorkshopPlan(parsed.data));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Atölye üretilemedi." },
      { status: 422 },
    );
  }
}
