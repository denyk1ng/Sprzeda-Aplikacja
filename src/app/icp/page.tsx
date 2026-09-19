"use client";

import { useEffect, useState } from "react";
import type { IcpProfile } from "@/lib/types";

export default function IcpPage() {
  const [icp, setIcp] = useState<IcpProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/icp")
      .then((r) => r.json())
      .then(setIcp);
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!icp) return;
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/icp", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(icp),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  if (!icp) return <p className="text-sm text-slate-500">Wczytywanie...</p>;

  return (
    <div className="card">
      <h1 className="mb-1 text-xl font-bold">Profil ICP i oferta</h1>
      <p className="mb-4 text-sm text-slate-600">
        Te dane sa uzywane do wyszukiwania wlasciwej osoby decyzyjnej (Apollo)
        oraz do generowania spersonalizowanych rekomendacji kontaktu.
      </p>
      <form onSubmit={save} className="flex flex-col gap-4">
        <Field label="Nazwa Twojej firmy">
          <input
            className="input"
            value={icp.companyName}
            onChange={(e) => setIcp({ ...icp, companyName: e.target.value })}
          />
        </Field>
        <Field label="Opis produktu / problemu, ktory rozwiazujesz">
          <textarea
            className="input min-h-[90px]"
            value={icp.productDescription}
            onChange={(e) =>
              setIcp({ ...icp, productDescription: e.target.value })
            }
          />
        </Field>
        <Field label="Kluczowe korzysci (jedna na linie)">
          <textarea
            className="input min-h-[70px]"
            value={icp.valueProps.join("\n")}
            onChange={(e) =>
              setIcp({
                ...icp,
                valueProps: e.target.value.split("\n").filter(Boolean),
              })
            }
          />
        </Field>
        <Field label="Docelowe stanowiska decyzyjne (jedno na linie)">
          <textarea
            className="input min-h-[110px]"
            value={icp.targetTitles.join("\n")}
            onChange={(e) =>
              setIcp({
                ...icp,
                targetTitles: e.target.value.split("\n").filter(Boolean),
              })
            }
          />
        </Field>
        <Field label="Docelowe branze (jedna na linie)">
          <textarea
            className="input min-h-[70px]"
            value={icp.targetIndustries.join("\n")}
            onChange={(e) =>
              setIcp({
                ...icp,
                targetIndustries: e.target.value.split("\n").filter(Boolean),
              })
            }
          />
        </Field>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? "Zapisuje..." : "Zapisz profil"}
          </button>
          {saved && <span className="text-sm text-green-600">Zapisano.</span>}
        </div>
      </form>
      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #cbd5e1;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
