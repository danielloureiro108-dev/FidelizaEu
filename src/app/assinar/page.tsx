import { Suspense } from "react";
import { CheckoutForm } from "@/components/CheckoutForm";

export const dynamic = "force-dynamic";

export default function AssinarPage() {
  return (
    <Suspense>
      <CheckoutForm />
    </Suspense>
  );
}
