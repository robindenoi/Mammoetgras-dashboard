"use client";

import { CATEGORIES, type Category } from "@/lib/types";

interface Props {
  active: Category | null;
  onChange: (cat: Category | null) => void;
}

export default function CategoryFilter({ active, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange(null)}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
          active === null
            ? "bg-mg-green text-white"
            : "bg-white text-gray-700 hover:bg-gray-100"
        }`}
      >
        Alle
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            active === cat
              ? "bg-mg-green text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
