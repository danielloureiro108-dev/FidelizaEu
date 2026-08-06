import { getActiveTenant } from "@/lib/tenant";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const tenant = await getActiveTenant();
  return (
    <LoginForm
      tenantId={tenant?.id ?? null}
      tenantName={tenant?.name ?? "Cartão Fidelidade"}
    />
  );
}
