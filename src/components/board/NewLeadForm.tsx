"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EXTRA_FIELDS } from "@/lib/csv";
import { stagesFor } from "@/lib/funnels";
import type { Lead, Funnel } from "@/lib/types";

interface Props {
  funnel: Funnel;
  currentUserId: string;
  onCreated: (lead: Lead) => void;
  onClose: () => void;
}

export default function NewLeadForm({
  funnel,
  currentUserId,
  onCreated,
  onClose,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [contactpersoon, setContactpersoon] = useState("");
  const [stad, setStad] = useState("");
  const [postcode, setPostcode] = useState("");
  const [notitie, setNotitie] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stages = stagesFor(funnel);

  async function submit() {
    if (!fullName.trim() && !phone.trim()) {
      setError("Vul minimaal een naam of telefoonnummer in.");
      return;
    }
    setBusy(true);
    setError(null);

    const extra: Record<string, string> = {};
    if (contactpersoon.trim()) extra.contactpersoon = contactpersoon.trim();
    if (stad.trim()) extra.stad = stad.trim();
    if (postcode.trim()) extra.postcode = postcode.trim();

    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("leads")
      .insert({
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        extra,
        agent_id: currentUserId,
        funnel,
        stage: stages[0],
        priority: "midden",
      })
      .select()
      .single();

    if (err) {
      setError(err.message);
      setBusy(false);
      return;
    }
    const lead = data as Lead;

    if (notitie.trim()) {
      await supabase.from("lead_comments").insert({
        lead_id: lead.id,
        author_id: currentUserId,
        body: notitie.trim(),
      });
    }

    onCreated(lead);
  }

  const field =
    "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-mg-green focus:outline-none focus:ring-2 focus:ring-mg-green/20";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl">
        <h2 className="mb-4 text-lg font-bold text-mg-dark">Nieuwe lead toevoegen</h2>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              Naam / bedrijf *
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Naam of bedrijfsnaam"
              className={field}
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              Contactpersoon
            </label>
            <input
              value={contactpersoon}
              onChange={(e) => setContactpersoon(e.target.value)}
              placeholder="Naam contactpersoon"
              className={field}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                Telefoon *
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                placeholder="06-12345678"
                className={field}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                E-mail
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="info@bedrijf.nl"
                className={field}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              Adres
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Straat en huisnummer"
              className={field}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                Postcode
              </label>
              <input
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="1234 AB"
                className={field}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                Stad
              </label>
              <input
                value={stad}
                onChange={(e) => setStad(e.target.value)}
                placeholder="Amsterdam"
                className={field}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              Notitie
            </label>
            <textarea
              value={notitie}
              onChange={(e) => setNotitie(e.target.value)}
              placeholder="Eventuele opmerking bij deze lead..."
              rows={3}
              className={field}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200"
          >
            Annuleren
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="flex-1 rounded-xl bg-mg-green py-3 text-sm font-bold text-white hover:bg-mg-accent disabled:opacity-50"
          >
            {busy ? "Bezig..." : "Toevoegen"}
          </button>
        </div>
      </div>
    </div>
  );
}
