import { getActiveTenant } from "@/lib/tenant";
import { DivulgarPanel } from "@/components/DivulgarPanel";

export const dynamic = "force-dynamic";

export default async function DivulgarPage() {
  const tenant = await getActiveTenant();

  return <DivulgarPanel name={tenant?.name ?? "Fidelidade"} logoUrl={tenant?.logo_url ?? null} />;
}
