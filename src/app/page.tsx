"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Company, Priority } from "@/lib/types";
import type { HiringLead } from "@/lib/job-signals";
import type { GeoLead } from "@/lib/geo-discovery";
import {
  Briefcase,
  Building,
  ChevronRight,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from "@/components/icons";

const PRIORITY_LABEL: Record<Priority, string> = {
  high: "Wysoki priorytet",
  medium: "Sredni priorytet",
  low: "Niski priorytet",
};

const PRIORITY_DOT: Record<Priority, string> = {
  high: "bg-emerald-500",
  medium: "bg-amber-500",
  low: "bg-ink-300",
};

const PRIORITY_BADGE: Record<Priority, string> = {
  high: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  medium: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  low: "bg-ink-100 text-ink-500 ring-1 ring-inset ring-ink-200",
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

  const [jobKeyword, setJobKeyword] = useState("");
  const [jobLeads, setJobLeads] = useState<HiringLead[] | null>(null);
  const [jobSearching, setJobSearching] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const [addingLead, setAddingLead] = useState<string | null>(null);

  const [geoCity, setGeoCity] = useState("");
  const [geoKeyword, setGeoKeyword] = useState("");
  const [geoLeads, setGeoLeads] = useState<GeoLead[] | null>(null);
  const [geoSearching, setGeoSearching] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [addingGeoLead, setAddingGeoLead] = useState<string | null>(null);

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

  const stats = useMemo(() => {
    const high = companies.filter((c) => c.priority === "high").length;
    const medium = companies.filter((c) => c.priority === "medium").length;
    const low = companies.filter((c) => c.priority === "low").length;
    return { total: companies.length, high, medium, low };
  }, [companies]);

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
      `Dodano ${data.added.length}, pominieto ${data.skipped.length}, bledy: ${data.failed.length}.`
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
      `Zweryfikowano ${data.results.length} kont - nowych sygnalow: ${newSignalsTotal}, wysoki priorytet: ${highCount}.`
    );
    await load();
  }

  async function searchJobs(e: React.FormEvent) {
    e.preventDefault();
    setJobSearching(true);
    setJobError(null);
    const res = await fetch("/api/discover/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: jobKeyword || undefined }),
    });
    const data = await res.json();
    setJobSearching(false);
    if (!res.ok) {
      setJobError(data.error ?? "Nie udalo sie przeszukac ofert pracy");
      setJobLeads(null);
      return;
    }
    setJobLeads(data.leads);
  }

  async function addLead(lead: HiringLead) {
    setAddingLead(lead.company);
    const res = await fetch("/api/discover/jobs/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName: lead.company, roleTitle: lead.roleTitle }),
    });
    const data = await res.json();
    setAddingLead(null);
    if (!res.ok) {
      setJobError(data.error ?? "Nie udalo sie dodac firmy");
      return;
    }
    setJobLeads((prev) => prev?.filter((l) => l.company !== lead.company) ?? null);
    await load();
  }

  async function searchGeo(e: React.FormEvent) {
    e.preventDefault();
    if (!geoCity.trim()) return;
    setGeoSearching(true);
    setGeoError(null);
    const res = await fetch("/api/discover/geo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city: geoCity.trim(), keyword: geoKeyword || undefined }),
    });
    const data = await res.json();
    setGeoSearching(false);
    if (!res.ok) {
      setGeoError(data.error ?? "Nie udalo sie przeszukac okolicy");
      setGeoLeads(null);
      return;
    }
    setGeoLeads(data.leads);
  }

  async function addGeoLead(lead: GeoLead) {
    setAddingGeoLead(lead.osmId);
    setGeoError(null);
    const res = await fetch("/api/discover/geo/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: lead.name,
        domain: lead.website,
        city: lead.city,
        phone: lead.phone,
      }),
    });
    const data = await res.json();
    setAddingGeoLead(null);
    if (!res.ok) {
      setGeoError(data.error ?? "Nie udalo sie dodac firmy");
      return;
    }
    setGeoLeads((prev) => prev?.filter((l) => l.osmId !== lead.osmId) ?? null);
    await load();
  }

  return (
    <div className="flex flex-col gap-7 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">
          Konta docelowe
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Dodaj firme po domenie - znajdziemy kontakt, sygnaly i priorytet.
        </p>
      </div>

      {!loading && companies.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<Building className="h-4 w-4" />} label="Wszystkie konta" value={stats.total} />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Wysoki priorytet"
            value={stats.high}
            tone="emerald"
          />
          <StatCard
            icon={<Sparkles className="h-4 w-4" />}
            label="Sredni priorytet"
            value={stats.medium}
            tone="amber"
          />
          <StatCard icon={<Users className="h-4 w-4" />} label="Niski priorytet" value={stats.low} />
        </div>
      )}

      <section className="card p-5 sm:p-6">
        <h2 className="section-title">Dodaj konto</h2>
        <p className="mt-1 text-sm text-ink-500">
          Sprobujemy znalezc prawdziwa osobe decyzyjna (Apollo, potem strona
          firmy) i dobrac e-mail. Jesli nic realnego sie nie znajdzie, na
          karcie firmy dodasz kontakt recznie - nigdy nie pokazujemy
          wygenerowanych danych jako prawdziwych.
        </p>
        <form onSubmit={addCompany} className="mt-4 flex flex-wrap gap-3">
          <input
            className="input flex-1 min-w-[180px]"
            placeholder="Nazwa firmy (opcjonalnie)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            required
            className="input flex-1 min-w-[180px]"
            placeholder="Domena, np. acme.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
          <button type="submit" disabled={adding} className="btn btn-primary">
            {adding ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {adding ? "Dodaje..." : "Dodaj i wzbogac"}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={() => setShowBulk((v) => !v)}
          className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600 hover:text-brand-700"
        >
          <ChevronRight
            className={`h-3.5 w-3.5 transition-transform ${showBulk ? "rotate-90" : ""}`}
          />
          {showBulk ? "Ukryj dodawanie hurtowe" : "Dodaj wiele firm naraz"}
        </button>
        {showBulk && (
          <form onSubmit={addBulk} className="mt-3 flex flex-col gap-2 border-t border-ink-100 pt-4">
            <textarea
              className="input min-h-[110px]"
              placeholder={"Wklej domeny, jedna na linie, np.:\nacme.com\nfirma2.pl\nklient3.com"}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={bulkBusy || !bulkText.trim()}
                className="btn btn-primary"
              >
                {bulkBusy ? "Dodaje wszystkie..." : "Dodaj wszystkie (max 30)"}
              </button>
              {bulkSummary && (
                <span className="text-sm text-ink-500">{bulkSummary}</span>
              )}
            </div>
          </form>
        )}
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-ink-400" />
          <h2 className="section-title">Znajdz prawdziwe firmy w okolicy</h2>
        </div>
        <p className="mt-1 text-xs text-ink-500">
          Wpisz miasto (np. Lublin) - przeszukamy OpenStreetMap w poszukiwaniu
          realnie zmapowanych firm z ta lokalizacja (adres, czesto telefon i
          strona). To dane z mapy, wiec traktuj je jako punkt startowy do
          wlasnej weryfikacji, nie gotowa liste - nic tu nie jest wygenerowane.
        </p>
        <form onSubmit={searchGeo} className="mt-4 flex flex-wrap gap-3">
          <input
            required
            className="input flex-1 min-w-[140px]"
            placeholder="Miasto, np. Lublin"
            value={geoCity}
            onChange={(e) => setGeoCity(e.target.value)}
          />
          <input
            className="input flex-1 min-w-[180px]"
            placeholder="Slowo kluczowe (opcjonalnie), np. consulting"
            value={geoKeyword}
            onChange={(e) => setGeoKeyword(e.target.value)}
          />
          <button type="submit" disabled={geoSearching} className="btn btn-primary">
            {geoSearching ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            {geoSearching ? "Szukam..." : "Szukaj"}
          </button>
        </form>
        {geoError && <p className="mt-2 text-sm text-red-600">{geoError}</p>}
        {geoLeads && (
          <div className="mt-4 flex flex-col gap-2">
            {geoLeads.length === 0 ? (
              <p className="text-sm text-ink-500">
                Brak wynikow dla tej miejscowosci w OpenStreetMap.
              </p>
            ) : (
              geoLeads.map((lead) => (
                <div
                  key={lead.osmId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-100 px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{lead.name}</p>
                    <p className="text-[13px] text-ink-500">
                      {[lead.category, lead.street, lead.city].filter(Boolean).join(" - ")}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-ink-400">
                      {lead.website && <span>{lead.website}</span>}
                      {lead.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  {lead.website ? (
                    <button
                      onClick={() => addGeoLead(lead)}
                      disabled={addingGeoLead === lead.osmId}
                      className="btn btn-secondary shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {addingGeoLead === lead.osmId ? "Dodaje..." : "Dodaj"}
                    </button>
                  ) : (
                    <span className="badge shrink-0 bg-ink-100 text-ink-500">
                      brak strony - dodaj recznie
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-ink-400" />
          <h2 className="section-title">Znajdz firmy, ktore wlasnie rekrutuja</h2>
        </div>
        <p className="mt-1 text-xs text-ink-500">
          Aktywna rekrutacja to jeden z najsilniejszych sygnalow, ze warto
          uderzyc teraz. Zrodlo: publiczne oferty IT/AI (nofluffjobs.com) -
          nie pokryje kazdej branzy, ale dziala bez klucza API. Filtr miast
          bierze sie z profilu ICP.
        </p>
        <form onSubmit={searchJobs} className="mt-4 flex flex-wrap gap-3">
          <input
            className="input flex-1 min-w-[180px]"
            placeholder='Slowo kluczowe w nazwie stanowiska, np. "AI", "manager"'
            value={jobKeyword}
            onChange={(e) => setJobKeyword(e.target.value)}
          />
          <button type="submit" disabled={jobSearching} className="btn btn-primary">
            {jobSearching ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            {jobSearching ? "Szukam..." : "Szukaj"}
          </button>
        </form>
        {jobError && <p className="mt-2 text-sm text-red-600">{jobError}</p>}
        {jobLeads && (
          <div className="mt-4 flex flex-col gap-2">
            {jobLeads.length === 0 ? (
              <p className="text-sm text-ink-500">Brak wynikow dla tych kryteriow.</p>
            ) : (
              jobLeads.map((lead) => (
                <div
                  key={lead.company}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-100 px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{lead.company}</p>
                    <p className="text-[13px] text-ink-500">
                      {lead.roleTitle}
                      {lead.city ? ` - ${lead.city}` : ""}
                      {lead.openRoles > 1 ? ` - ${lead.openRoles} ofert` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => addLead(lead)}
                    disabled={addingLead === lead.company}
                    className="btn btn-secondary shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {addingLead === lead.company ? "Dodaje..." : "Dodaj"}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">
            Lista kont {!loading && `(${companies.length})`}
          </h2>
          {companies.length > 0 && (
            <button onClick={verifyAll} disabled={verifying} className="btn btn-secondary">
              <RefreshCw className={`h-3.5 w-3.5 ${verifying ? "animate-spin" : ""}`} />
              {verifying ? "Weryfikuje wszystko..." : "Weryfikuj wszystko"}
            </button>
          )}
        </div>
        {verifySummary && (
          <p className="mb-3 text-sm text-ink-500">{verifySummary}</p>
        )}
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="card h-28 animate-pulse bg-ink-50" />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 px-6 py-14 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Building className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium text-ink-700">Brak kont</p>
            <p className="text-sm text-ink-500">
              Dodaj pierwsza firme w formularzu powyzej.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {companies.map((c) => (
              <Link
                key={c.id}
                href={`/companies/${c.id}`}
                className="card card-hover animate-in block p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
                      <Building className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-semibold text-ink-900">{c.name}</p>
                      <p className="text-[13px] text-ink-500">{c.domain}</p>
                    </div>
                  </div>
                  {c.priority && (
                    <span className={`badge shrink-0 ${PRIORITY_BADGE[c.priority]}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[c.priority]}`} />
                      {PRIORITY_LABEL[c.priority]}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.industry && <span className="badge bg-ink-100 text-ink-600">{c.industry}</span>}
                  {c.employeeCount && (
                    <span className="badge bg-ink-100 text-ink-600">{c.employeeCount} os.</span>
                  )}
                </div>
                {c.priorityReason && (
                  <p className="mt-2.5 line-clamp-2 text-xs text-ink-400">{c.priorityReason}</p>
                )}
                {c.nextStepAt && (
                  <p className="mt-1.5 text-xs font-medium text-brand-600">
                    Nastepny krok: {new Date(c.nextStepAt).toLocaleDateString("pl-PL")}
                    {c.nextStepNote ? ` - ${c.nextStepNote}` : ""}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "emerald" | "amber";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "amber"
      ? "bg-amber-50 text-amber-600"
      : "bg-brand-50 text-brand-600";
  return (
    <div className="card flex items-center gap-3 px-4 py-3.5">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
        {icon}
      </span>
      <div>
        <p className="text-lg font-bold leading-none text-ink-900">{value}</p>
        <p className="mt-1 text-[11px] font-medium text-ink-500">{label}</p>
      </div>
    </div>
  );
}
