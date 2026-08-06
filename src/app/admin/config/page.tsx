import { getActiveTenant, getActiveProgram } from "@/lib/tenant";
import { ConfigForm } from "@/components/ConfigForm";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const tenant = await getActiveTenant();
  const program = tenant ? await getActiveProgram(tenant.id) : null;

  if (!tenant || !program) {
    return (
      <p className="text-neutral-600">
        Nenhum estabelecimento/programa encontrado. Rode a migration inicial.
      </p>
    );
  }

  return <ConfigForm tenant={tenant} program={program} />;
}
