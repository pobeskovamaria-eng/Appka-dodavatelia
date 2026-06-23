import { notFound } from "next/navigation";
import { SupplierForm } from "@/components/SupplierForm";
import { getSupplier } from "@/lib/db";
import { updateSupplierAction } from "@/app/actions";

export default function EditSupplierPage({
  params,
}: {
  params: { id: string };
}) {
  const supplier = getSupplier(params.id);
  if (!supplier) notFound();

  const action = updateSupplierAction.bind(null, params.id);

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Upraviť dodávateľa
        </h1>
        <p className="text-sm text-ink/60 mt-1">{supplier.name}</p>
      </div>
      <SupplierForm
        initial={supplier}
        submitLabel="Uložiť zmeny"
        action={action}
      />
    </div>
  );
}
