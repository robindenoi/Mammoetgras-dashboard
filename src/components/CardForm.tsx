"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES, type Card, type Category } from "@/lib/types";

interface Props {
  card?: Card | null;
  onSaved: (card: Card) => void;
}

export default function CardForm({ card, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<Category>(card?.category ?? "Geld");
  const [objection, setObjection] = useState(card?.objection ?? "");
  const [erkennen, setErkennen] = useState(card?.erkennen ?? "");
  const [reframe, setReframe] = useState(card?.reframe ?? "");
  const [bewijs, setBewijs] = useState(card?.bewijs ?? "");
  const [afsluitvraag, setAfsluitvraag] = useState(card?.afsluitvraag ?? "");
  const [script, setScript] = useState(card?.script ?? "");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(card?.audio_url ?? null);

  async function uploadAudio(supabase: ReturnType<typeof createClient>, cardId: string): Promise<string | null> {
    if (!audioFile) return audioUrl;
    const ext = audioFile.name.split(".").pop();
    const path = `${cardId}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("audio")
      .upload(path, audioFile, { upsert: true });
    if (upErr) throw new Error(`Upload mislukt: ${upErr.message}`);
    const { data: urlData } = supabase.storage.from("audio").getPublicUrl(path);
    return urlData.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const data = { category, objection, erkennen, reframe, bewijs, afsluitvraag, script, audio_url: audioUrl };

    try {
      if (card) {
        if (audioFile) {
          data.audio_url = await uploadAudio(supabase, card.id);
        }
        const { data: updated, error: err } = await supabase
          .from("cards")
          .update(data)
          .eq("id", card.id)
          .select()
          .single();
        if (err) setError(err.message);
        else onSaved(updated as Card);
      } else {
        const { data: created, error: err } = await supabase
          .from("cards")
          .insert(data)
          .select()
          .single();
        if (err) {
          setError(err.message);
        } else if (created) {
          if (audioFile) {
            const url = await uploadAudio(supabase, created.id);
            await supabase.from("cards").update({ audio_url: url }).eq("id", created.id);
            (created as Card).audio_url = url;
          }
          onSaved(created as Card);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Er ging iets mis");
    }

    setLoading(false);
  }

  const fieldClass =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:border-mg-green focus:outline-none focus:ring-2 focus:ring-mg-green/20";

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
      <h2 className="mb-6 text-xl font-bold text-gray-900">
        {card ? "Kaart bewerken" : "Nieuwe bezwaarkaart"}
      </h2>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            Categorie
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className={fieldClass}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            Bezwaar
          </label>
          <input
            type="text"
            required
            value={objection}
            onChange={(e) => setObjection(e.target.value)}
            placeholder="Wat zegt de klant?"
            className={fieldClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            1. Erkennen
          </label>
          <textarea
            required
            rows={2}
            value={erkennen}
            onChange={(e) => setErkennen(e.target.value)}
            placeholder="Hoe erken je het bezwaar?"
            className={fieldClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            2. Reframe
          </label>
          <textarea
            required
            rows={2}
            value={reframe}
            onChange={(e) => setReframe(e.target.value)}
            placeholder="Hoe herformuleer je het?"
            className={fieldClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            3. Bewijs
          </label>
          <textarea
            required
            rows={2}
            value={bewijs}
            onChange={(e) => setBewijs(e.target.value)}
            placeholder="Welk bewijs lever je?"
            className={fieldClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            4. Afsluitvraag
          </label>
          <textarea
            required
            rows={2}
            value={afsluitvraag}
            onChange={(e) => setAfsluitvraag(e.target.value)}
            placeholder="Hoe sluit je af?"
            className={fieldClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            Voorbeeldscript
          </label>
          <textarea
            required
            rows={4}
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Het volledige voorbeeldgesprek..."
            className={fieldClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">
            Audiofragment (optioneel)
          </label>
          {audioUrl && !audioFile && (
            <div className="mb-2 flex items-center gap-2">
              <audio controls preload="metadata" className="h-10">
                <source src={audioUrl} />
              </audio>
              <button
                type="button"
                onClick={() => setAudioUrl(null)}
                className="text-sm text-red-500 hover:underline"
              >
                Verwijderen
              </button>
            </div>
          )}
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-mg-green/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-mg-green hover:file:bg-mg-green/20"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-xl bg-mg-green py-3 text-sm font-bold text-white transition-colors hover:bg-mg-accent disabled:opacity-50"
      >
        {loading ? "Opslaan..." : card ? "Wijzigingen opslaan" : "Kaart aanmaken"}
      </button>
    </form>
  );
}
