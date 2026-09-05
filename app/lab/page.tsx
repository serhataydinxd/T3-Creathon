import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { WorkshopLab } from "@/components/workshop-lab";
import { requireRole } from "@/server/auth/session";
import { liveGenerationEnabled } from "@/server/ai/generate";
import { listCentreStates } from "@/server/domain/centre-store";

export const metadata: Metadata = {
  title: 'Atölye laboratuvarı',
  // Behind the role guard: a crawler only ever sees a redirect to the login page.
  robots: { index: false, follow: false },
};

export default async function LabPage() {
  const user = await requireRole(["content_expert", "pedagogue"]);
  // Read from the operational record rather than the research file, so a
  // facility an educator verified last week is what the lab offers today.
  const centres = await listCentreStates();
  const centreStatuses = Object.fromEntries(
    centres.map((centre) => [
      centre.slug,
      Object.fromEntries(centre.capabilities.map((item) => [item.capability, item.status])),
    ]),
  );
  return (
    <AppShell user={user}>
      <WorkshopLab live={liveGenerationEnabled()} centreStatuses={centreStatuses} />
    </AppShell>
  );
}
