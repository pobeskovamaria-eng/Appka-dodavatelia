import { SupplierForm } from "@/components/SupplierForm";
import { mergeWithDefaults } from "@/lib/db";
import { createSupplierAction } from "@/app/actions";

export default function NewSupplierPage() {
  const empty = mergeWithDefaults({});
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pridať dodávateľa</h1>
        <p className="text-sm text-ink/60 mt-1">
          Povinné sú iba <strong>názov firmy</strong> a <strong>webová stránka</strong>.
          Ostatné polia môžeš dopĺňať postupne.
        </p>
      </div>
      <SupplierForm
        initial={empty}
        submitLabel="Uložiť dodávateľa"
        action={createSupplierAction}
      />
    </div>
  );
}
