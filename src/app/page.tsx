"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Company } from "@/lib/types";

export default function DashboardPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/companies");
    const data = await res.json();
    setCompanies(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addCompany(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, domain }),
    });
    setAdding(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Nie udalo sie dodac firmy");
      return;
    }
    setName("");
    setDomain("");
    await load();
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="card">
        <h1 className="mb-1 text-xl font-bold">Konta docelowe</h1>
        <p className="mb-4 text-sm text-slate-600">
          Dodaj firme po domenie. Automatycznie znajdziemy wlasciwa osobe
          decyzyjna (Apollo), dobierzemy e-mail (Apollo + Snov.io waterfall)
          i przygotujemy podglad pod sledzenie sygnalow.
        </p>
        <form onSubmit={addCompany} className="flex flex-wrap gap-3">
          <input
            className="flex-1 min-w-[180px] rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Nazwa firmy (opcjonalnie)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            required
            className="flex-1 min-w-[180px] rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Domena, np. acme.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
          <button type="submit" disabled={adding} className="btn btn-primary">
            {adding ? "Dodaje..." : "Dodaj i wzbogac"}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Lista kont {loading ? "" : `(${companies.length})`}
        </h2>
        {loading ? (
          <p className="text-sm text-slate-500">Wczytywanie...</p>
        ) : companies.length === 0 ? (
          <p className="text-sm text-slate-500">
            Brak kont. Dodaj pierwsza firme powyzej.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {companies.map((c) => (
              <Link
                key={c.id}
                href={`/companies/${c.id}`}
                className="card block transition hover:border-slate-400"
              >
                <p className="font-semibold">{c.name}</p>
                <p className="text-sm text-slate-500">{c.domain}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                  {c.industry && (
                    <span className="badge bg-slate-100">{c.industry}</span>
                  )}
                  {c.employeeCount && (
                    <span className="badge bg-slate-100">
                      {c.employeeCount} os.
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
