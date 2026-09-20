"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Company, Priority } from "@/lib/types";

const PRIORITY_LABEL: Record<Priority, string> = {
  high: "Wysoki priorytet",
  medium: "Sredni priorytet",
  low: "Niski priorytet",
};

const PRIORITY_COLOR: Record<Priority, string> = {
  high: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-slate-200 text-slate-700",
};

export default function DashboardPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");

  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkSummary, setBulkSummary] = useState<string | null>(null);

  const [verifying, setVerifying] = useState(false);
  const [verifySummary, setVerifySummary] = useState<string | null>(null);

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

  async function addBulk(e: React.FormEvent) {
    e.preventDefault();
    setBulkBusy(true);
    setBulkSummary(null);
    const domains = bulkText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const res = await fetch("/api/companies/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domains }),
    });
    const data = await res.json();
    setBulkBusy(false);
    if (!res.ok) {
      setBulkSummary(data.error ?? "Nie udalo sie dodac firm");
      return;
    }
    setBulkSummary(
      `Dodano: ${data.added.length}, pominieto (juz na liscie): ${data.skipped.length}, bledy: ${data.failed.length}.`
    );
    setBulkText("");
    await load();
  }

  async function verifyAll() {
    setVerifying(true);
    setVerifySummary(null);
    const res = await fetch("/api/companies/verify-all", { method: "POST" });
    const data = await res.json();
    setVerifying(false);
    if (!res.ok) {
      setVerifySummary(data.error ?? "Nie udalo sie zweryfikowac kont");
      return;
    }
    const highCount = data.results.filter((r: any) => r.priority === "high").length;
    const newSignalsTotal = data.results.reduce(
      (sum: number, r: any) => sum + r.newSignals,
      0
    );
    setVerifySummary(
      `Zweryfikowano ${data.results.length} kont. Nowych sygnalow: ${newSignalsTotal}. Wysoki priorytet: ${highCount}.`
    );
    await load();
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="card">
        <h1 className="mb-1 text-xl font-bold">Konta docelowe</h1>
        <p className="mb-4 text-sm text-slate-600">
          Dodaj firme po domenie. Automatycznie znajdziemy wlasciwa osobe
          decyzyjna (Apollo -&gt; nasz wlasny skaner strony firmy -&gt; demo),
          dobierzemy e-mail (Snov.io waterfall) i wyliczymy priorytet kontaktu.
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

        <button
          type="button"
          onClick={() => setShowBulk((v) => !v)}
          className="mt-3 text-sm font-medium text-blue-600 hover:underline"
        >
          {showBulk ? "Ukryj dodawanie hurtowe" : "Dodaj wiele firm naraz"}
        </button>
        {showBulk && (
          <form onSubmit={addBulk} className="mt-3 flex flex-col gap-2">
            <textarea
              className="min-h-[110px] rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder={"Wklej domeny, jedna na linie, np.:\nacme.com\nfirma2.pl\nklient3.com"}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={bulkBusy || !bulkText.trim()}
                className="btn btn-primary"
              >
                {bulkBusy ? "Dodaje wszystkie..." : "Dodaj wszystkie (max 30)"}
              </button>
              {bulkSummary && (
                <span className="text-sm text-slate-600">{bulkSummary}</span>
              )}
            </div>
          </form>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">
            Lista kont {loading ? "" : `(${companies.length})`}
          </h2>
          {companies.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={verifyAll}
                disabled={verifying}
                className="btn btn-secondary"
              >
                {verifying ? "Weryfikuje wszystko..." : "Weryfikuj wszystko"}
              </button>
            </div>
          )}
        </div>
        {verifySummary && (
          <p className="mb-3 text-sm text-slate-600">{verifySummary}</p>
        )}
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
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{c.name}</p>
                  {c.priority && (
                    <span className={`badge shrink-0 ${PRIORITY_COLOR[c.priority]}`}>
                      {PRIORITY_LABEL[c.priority]}
                    </span>
                  )}
                </div>
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
                {c.priorityReason && (
                  <p className="mt-2 text-xs text-slate-400">{c.priorityReason}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
