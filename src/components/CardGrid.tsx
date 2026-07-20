"use client";

import { useState } from "react";
import type { Card, Category } from "@/lib/types";
import { CATEGORY_COLORS } from "@/lib/types";
import CategoryFilter from "./CategoryFilter";
import CardDetail from "./CardDetail";
import CardForm from "./CardForm";
import { useAuth } from "./AuthProvider";
import { createClient } from "@/lib/supabase/client";

interface Props {
  initialCards: Card[];
}

export default function CardGrid({ initialCards }: Props) {
  const { user } = useAuth();
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [filter, setFilter] = useState<Category | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Card | null>(null);
  const [editing, setEditing] = useState<Card | null>(null);
  const [showForm, setShowForm] = useState(false);

  const filtered = cards.filter((c) => {
    if (filter && c.category !== filter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.objection.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.erkennen.toLowerCase().includes(q) ||
      c.reframe.toLowerCase().includes(q) ||
      c.bewijs.toLowerCase().includes(q) ||
      c.afsluitvraag.toLowerCase().includes(q) ||
      c.script.toLowerCase().includes(q)
    );
  });

  async function handleDelete(id: string) {
    if (!confirm("Weet je zeker dat je deze kaart wilt verwijderen?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("cards").delete().eq("id", id);
    if (!error) {
      setCards((prev) => prev.filter((c) => c.id !== id));
      setSelected(null);
    }
  }

  function handleSaved(card: Card) {
    setCards((prev) => {
      const idx = prev.findIndex((c) => c.id === card.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = card;
        return next;
      }
      return [card, ...prev];
    });
    setShowForm(false);
    setEditing(null);
  }

  if (selected && !showForm && !editing) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <button
          onClick={() => setSelected(null)}
          className="mb-4 flex items-center gap-1 text-sm font-medium text-mg-green hover:underline"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Terug naar overzicht
        </button>
        <CardDetail
          card={selected}
          isAdmin={!!user}
          onEdit={() => setEditing(selected)}
          onDelete={() => handleDelete(selected.id)}
        />
      </div>
    );
  }

  if (showForm || editing) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <button
          onClick={() => {
            setShowForm(false);
            setEditing(null);
          }}
          className="mb-4 flex items-center gap-1 text-sm font-medium text-mg-green hover:underline"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Annuleren
        </button>
        <CardForm card={editing} onSaved={handleSaved} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="relative mb-4">
        <svg
          className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op bezwaar, trefwoord of script..."
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-gray-800 placeholder:text-gray-400 focus:border-mg-green focus:outline-none focus:ring-2 focus:ring-mg-green/20"
        />
      </div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CategoryFilter active={filter} onChange={setFilter} />
        {user && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-mg-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-mg-accent"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nieuwe kaart
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-gray-500">
          Geen bezwaarkaarten gevonden.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((card) => (
            <button
              key={card.id}
              onClick={() => setSelected(card)}
              className="group flex flex-col rounded-2xl bg-white p-6 text-left shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <span
                className={`mb-3 inline-block self-start rounded-full px-3 py-1 text-xs font-semibold ${CATEGORY_COLORS[card.category]}`}
              >
                {card.category}
              </span>
              <p className="text-lg font-semibold leading-snug text-gray-800">
                &ldquo;{card.objection}&rdquo;
              </p>
              <span className="mt-4 text-sm font-medium text-mg-green opacity-0 transition-opacity group-hover:opacity-100">
                Bekijk route &rarr;
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
