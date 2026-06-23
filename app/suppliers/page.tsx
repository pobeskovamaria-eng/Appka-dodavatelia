import { listSuppliers } from "@/lib/db";
import { SuppliersList } from "@/components/SuppliersList";

export const dynamic = "force-dynamic";

export default function SuppliersPage() {
  const suppliers = listSuppliers();
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dodávatelia</h1>
          <p className="text-sm text-ink/60 mt-1">
            Filtruj, zoraď a otvor detail jednotlivých dodávateľov.
          </p>
        </div>
      </div>
      <SuppliersList suppliers={suppliers} />
    </div>
  );
}
