import { AppShell } from "@/components/app-shell";
import { WorkshopLab } from "@/components/workshop-lab";
import { requireRole } from "@/server/auth/session";
import { liveGenerationEnabled } from "@/server/ai/generate";

export default async function LabPage() {
  const user = await requireRole(["content_expert", "pedagogue"]);
  return (
    <AppShell user={user}>
      <WorkshopLab live={liveGenerationEnabled()} />
    </AppShell>
  );
}
