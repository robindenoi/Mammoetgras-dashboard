import type { Card } from "@/lib/types";
import { CATEGORY_COLORS } from "@/lib/types";

interface Props {
  card: Card;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const STEPS = [
  { key: "erkennen", label: "Erkennen", num: 1 },
  { key: "reframe", label: "Reframe", num: 2 },
  { key: "bewijs", label: "Bewijs", num: 3 },
  { key: "afsluitvraag", label: "Afsluitvraag", num: 4 },
] as const;

export default function CardDetail({ card, isAdmin, onEdit, onDelete }: Props) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span
            className={`mb-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${CATEGORY_COLORS[card.category]}`}
          >
            {card.category}
          </span>
          <h2 className="text-2xl font-bold leading-tight text-gray-900">
            &ldquo;{card.objection}&rdquo;
          </h2>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="rounded-lg bg-mg-green/10 px-4 py-2 text-sm font-medium text-mg-green transition-colors hover:bg-mg-green/20"
            >
              Bewerken
            </button>
            <button
              onClick={onDelete}
              className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
            >
              Verwijderen
            </button>
          </div>
        )}
      </div>

      <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-mg-green">
        Route naar de close
      </h3>

      <div className="space-y-4">
        {STEPS.map((step) => (
          <div key={step.key} className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mg-green text-sm font-bold text-white">
              {step.num}
            </div>
            <div className="pt-1">
              <p className="text-sm font-bold text-gray-700">{step.label}</p>
              <p className="mt-1 leading-relaxed text-gray-600">
                {card[step.key]}
              </p>
            </div>
          </div>
        ))}
      </div>

      {card.audio_url && (
        <div className="mt-8 rounded-xl bg-mg-dark/5 p-5">
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-mg-green">
            Beluister het script
          </h4>
          <audio controls className="w-full" preload="metadata">
            <source src={card.audio_url} />
          </audio>
        </div>
      )}

      <div className="mt-8 rounded-xl border-2 border-dashed border-mg-green/20 bg-mg-light p-5">
        <h4 className="mb-2 text-sm font-bold uppercase tracking-wider text-mg-green">
          Voorbeeldscript
        </h4>
        <p className="whitespace-pre-line leading-relaxed text-gray-700">
          {card.script}
        </p>
      </div>
    </div>
  );
}
