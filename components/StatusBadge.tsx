import type { Rating, Status, TriState } from "@/lib/types";
import { labelOf } from "@/lib/constants";
import { STATUSES, RATINGS } from "@/lib/constants";

export function RatingBadge({ rating, score }: { rating: Rating; score?: number }) {
  const color = ratingColor(rating);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {labelOf(RATINGS, rating)}
      {typeof score === "number" && (
        <span className="opacity-70">· {score}</span>
      )}
    </span>
  );
}

function ratingColor(rating: Rating): string {
  switch (rating) {
    case "velmi_vhodny":
      return "bg-green-100 text-green-800";
    case "vhodny":
      return "bg-sky-100 text-sky-800";
    case "mozno_vhodny":
      return "bg-yellow-100 text-yellow-800";
    case "nevhodny":
      return "bg-red-100 text-red-800";
    default:
      return "bg-neutral-200 text-neutral-700";
  }
}

export function StatusChip({ status }: { status: Status | "" }) {
  if (!status)
    return (
      <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-neutral-200 text-neutral-700">
        Neoverené
      </span>
    );
  const colorMap: Record<Status, string> = {
    novy_nalez: "bg-neutral-100 text-neutral-700",
    caka_na_preverenie: "bg-amber-100 text-amber-800",
    predbezne_vhodny: "bg-sky-100 text-sky-800",
    kontaktovany: "bg-indigo-100 text-indigo-800",
    cakam_na_odpoved: "bg-violet-100 text-violet-800",
    odpovedal: "bg-cyan-100 text-cyan-800",
    vhodny: "bg-green-100 text-green-800",
    nevhodny: "bg-red-100 text-red-800",
    vyradeny: "bg-neutral-300 text-neutral-700",
    shortlist: "bg-pink-100 text-pink-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${colorMap[status]}`}
    >
      {labelOf(STATUSES, status)}
    </span>
  );
}

export function TriBadge({ value }: { value: TriState | "" }) {
  if (value === "ano")
    return <span className="text-green-700 font-medium">Áno</span>;
  if (value === "nie") return <span className="text-red-700">Nie</span>;
  return <span className="text-neutral-500">Neoverené</span>;
}

export function RiskBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800">
      {children}
    </span>
  );
}
