import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { WorkshopLab } from "@/components/workshop-lab";
import { requireRole } from "@/server/auth/session";
import { liveGenerationEnabled } from "@/server/ai/generate";

export const metadata: Metadata = {
  title: 'Atölye laboratuvarı',
  // Behind the role guard: a crawler only ever sees a redirect to the login page.
  robots: { index: false, follow: false },
};

export default async function LabPage() {
  const user = await requireRole(["content_expert", "pedagogue"]);
  return (
    <AppShell user={user}>
      <WorkshopLab live={liveGenerationEnabled()} />
    </AppShell>
  );
}
