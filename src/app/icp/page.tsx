"use client";

import { useEffect, useState } from "react";
import type { IcpProfile } from "@/lib/types";
import { Check, RefreshCw, Sparkles } from "@/components/icons";

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

  if (!icp) return <div className="card h-64 animate-pulse bg-ink-50" />;

  return (
    <div className="flex flex-col gap-6 animate-in">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink-900">Profil ICP i oferta</h1>
          <p className="text-sm text-ink-500">
            Uzywane do wyszukiwania decydentow i generowania rekomendacji.
          </p>
        </div>
      </div>

      <form onSubmit={save} className="card flex flex-col gap-5 p-5 sm:p-6">
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
            onChange={(e) => setIcp({ ...icp, productDescription: e.target.value })}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Kluczowe korzysci" hint="jedna na linie">
            <textarea
              className="input min-h-[110px]"
              value={icp.valueProps.join("\n")}
              onChange={(e) =>
                setIcp({ ...icp, valueProps: e.target.value.split("\n").filter(Boolean) })
              }
            />
          </Field>
          <Field label="Docelowe stanowiska decyzyjne" hint="jedno na linie">
            <textarea
              className="input min-h-[110px]"
              value={icp.targetTitles.join("\n")}
              onChange={(e) =>
                setIcp({ ...icp, targetTitles: e.target.value.split("\n").filter(Boolean) })
              }
            />
          </Field>
        </div>
        <Field label="Docelowe branze" hint="opcjonalnie - puste = wszystkie branze">
          <textarea
            className="input min-h-[70px]"
            value={icp.targetIndustries.join("\n")}
            onChange={(e) =>
              setIcp({ ...icp, targetIndustries: e.target.value.split("\n").filter(Boolean) })
            }
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Min. liczba pracownikow" hint="opcjonalnie">
            <input
              type="number"
              min={0}
              className="input"
              value={icp.minEmployees ?? ""}
              onChange={(e) =>
                setIcp({
                  ...icp,
                  minEmployees: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </Field>
          <Field label="Maks. liczba pracownikow" hint="opcjonalnie">
            <input
              type="number"
              min={0}
              className="input"
              value={icp.maxEmployees ?? ""}
              onChange={(e) =>
                setIcp({
                  ...icp,
                  maxEmployees: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </Field>
          <Field label="Miasta" hint="jedno na linie, puste = cala Polska">
            <textarea
              className="input min-h-[42px]"
              value={icp.cities.join("\n")}
              onChange={(e) =>
                setIcp({ ...icp, cities: e.target.value.split("\n").filter(Boolean) })
              }
            />
          </Field>
        </div>
        <div className="flex items-center gap-3 border-t border-ink-100 pt-4">
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
            {saving ? "Zapisuje..." : "Zapisz profil"}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
              <Check className="h-3.5 w-3.5" /> Zapisano
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label">
        {label} {hint && <span className="font-normal text-ink-400">({hint})</span>}
      </span>
      {children}
    </label>
  );
}
