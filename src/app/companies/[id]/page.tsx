"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Company, Contact, Priority, Recommendation, Signal } from "@/lib/types";

interface DetailResponse {
  company: Company;
  contacts: Contact[];
  signals: Signal[];
  recommendations: Recommendation[];
}

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

const SIGNAL_LABEL: Record<Signal["type"], string> = {
  job_posting: "Rekrutacja",
  news: "Wzmianka w mediach",
  funding: "Finansowanie",
  leadership_change: "Zmiana w zarzadzie",
  manual: "Recznie dodany",
};

const SIGNAL_COLOR: Record<Signal["type"], string> = {
  job_posting: "bg-blue-100 text-blue-800",
  news: "bg-slate-100 text-slate-800",
  funding: "bg-green-100 text-green-800",
  leadership_change: "bg-purple-100 text-purple-800",
  manual: "bg-amber-100 text-amber-800",
};

export default function CompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [krsInput, setKrsInput] = useState("");
  const [krsBusy, setKrsBusy] = useState(false);
  const [krsError, setKrsError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/companies/${params.id}`);
    if (!res.ok) {
      setData(null);
      return;
    }
    setData(await res.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function refreshSignals() {
    setRefreshing(true);
    await fetch(`/api/companies/${params.id}/refresh-signals`, {
      method: "POST",
    });
    await load();
    setRefreshing(false);
  }

  async function generateRecommendation(signalId?: string) {
    setGeneratingFor(signalId ?? "general");
    await fetch(`/api/companies/${params.id}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signalId }),
    });
    await load();
    setGeneratingFor(null);
  }

  async function checkKrs(e: React.FormEvent) {
    e.preventDefault();
    if (!krsInput.trim()) return;
    setKrsBusy(true);
    setKrsError(null);
    const res = await fetch(`/api/companies/${params.id}/krs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ krsNumber: krsInput.trim() }),
    });
    const body = await res.json();
    setKrsBusy(false);
    if (!res.ok) {
      setKrsError(body.error ?? "Nie udalo sie sprawdzic KRS");
      return;
    }
    setKrsInput("");
    await load();
  }

  async function deleteCompany() {
    if (!confirm("Usunac te firme wraz z kontaktami i historia?")) return;
    setDeleting(true);
    await fetch(`/api/companies/${params.id}`, { method: "DELETE" });
    router.push("/");
  }

  if (!data) return <p className="text-sm text-slate-500">Wczytywanie...</p>;

  const { company, contacts, signals, recommendations } = data;
  const primaryContact = contacts.find((c) => c.isPrimary);

  return (
    <div className="flex flex-col gap-6">
      <section className="card flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{company.name}</h1>
          <p className="text-sm text-slate-500">{company.domain}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {company.industry && (
              <span className="badge bg-slate-100">{company.industry}</span>
            )}
            {company.employeeCount && (
              <span className="badge bg-slate-100">
                {company.employeeCount} pracownikow
              </span>
            )}
            {company.priority && (
              <span className={`badge ${PRIORITY_COLOR[company.priority]}`}>
                {PRIORITY_LABEL[company.priority]}
              </span>
            )}
          </div>
          {company.priorityReason && (
            <p className="mt-2 text-xs text-slate-400">{company.priorityReason}</p>
          )}
        </div>
        <button
          onClick={deleteCompany}
          disabled={deleting}
          className="btn btn-secondary"
        >
          Usun
        </button>
      </section>

      <section className="card">
        <h2 className="mb-1 text-lg font-semibold">Weryfikacja w KRS</h2>
        <p className="mb-3 text-xs text-slate-500">
          Wpisz numer KRS recznie (nie da sie go automatycznie znalezc po
          domenie - oficjalna wyszukiwarka KRS jest zablokowana dla botow).
          Pobierzemy twarde fakty rejestrowe. Wykrywanie likwidacji/upadlosci
          jest orientacyjne - w razie watpliwosci sprawdz pelny odpis.
        </p>
        {company.krsNumber ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="badge bg-slate-100">KRS {company.krsNumber}</span>
            {company.krsLegalForm && (
              <span className="badge bg-slate-100">{company.krsLegalForm}</span>
            )}
            {company.krsRegisteredAt && (
              <span className="badge bg-slate-100">
                zarejestrowana {company.krsRegisteredAt}
              </span>
            )}
            {company.krsLegalFlag && (
              <span className="badge bg-red-100 text-red-800">
                {company.krsLegalFlag === "upadlosc"
                  ? "Upadlosc (wg KRS)"
                  : "W likwidacji (wg KRS)"}
              </span>
            )}
            <a
              href={`https://ekrs.ms.gov.pl/web/wyszukiwarka-krs/strona-glowna/`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline"
            >
              sprawdz pelny odpis
            </a>
          </div>
        ) : (
          <form onSubmit={checkKrs} className="flex flex-wrap gap-2">
            <input
              className="min-w-[160px] rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Numer KRS, np. 0000635012"
              value={krsInput}
              onChange={(e) => setKrsInput(e.target.value)}
            />
            <button type="submit" disabled={krsBusy} className="btn btn-secondary">
              {krsBusy ? "Sprawdzam..." : "Sprawdz w KRS"}
            </button>
          </form>
        )}
        {krsError && <p className="mt-2 text-sm text-red-600">{krsError}</p>}
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">Kontakty decyzyjne</h2>
        {contacts.length === 0 ? (
          <p className="text-sm text-slate-500">Brak znalezionych kontaktow.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {contacts
              .slice()
              .sort((a, b) => b.titleMatchScore - a.titleMatchScore)
              .map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                >
                  <div>
                    <p className="font-medium">
                      {c.firstName} {c.lastName}{" "}
                      {c.isPrimary && (
                        <span className="badge bg-slate-900 text-white ml-1">
                          Rekomendowany kontakt
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-slate-600">
                      {c.title}{" "}
                      {c.contactSource && (
                        <span
                          className={`badge ml-1 ${
                            c.contactSource === "apollo"
                              ? "bg-blue-100 text-blue-800"
                              : c.contactSource === "website"
                              ? "bg-green-100 text-green-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {c.contactSource === "apollo"
                            ? "Apollo"
                            : c.contactSource === "website"
                            ? "strona firmy"
                            : "demo"}
                        </span>
                      )}
                    </p>
                    {c.email && (
                      <p className="text-xs text-slate-500">
                        {c.email}{" "}
                        <span
                          className={`badge ml-1 ${
                            c.emailStatus === "verified"
                              ? "bg-green-100 text-green-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {c.emailStatus === "verified"
                            ? "zweryfikowany"
                            : "przypuszczalny"}
                        </span>
                        {c.emailSource && (
                          <span className="ml-1 text-slate-400">
                            zrodlo: {c.emailSource}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  {c.linkedinUrl && (
                    <a
                      href={c.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      LinkedIn
                    </a>
                  )}
                </div>
              ))}
          </div>
        )}
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Sygnaly zmian u klienta
          </h2>
          <button
            onClick={refreshSignals}
            disabled={refreshing}
            className="btn btn-secondary"
          >
            {refreshing ? "Sprawdzam..." : "Odswiez sygnaly"}
          </button>
        </div>
        {signals.length === 0 ? (
          <p className="text-sm text-slate-500">
            Brak wykrytych sygnalow. Kliknij "Odswiez sygnaly", aby sprawdzic
            rekrutacje i wzmianki w mediach.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {signals.map((s) => (
              <div
                key={s.id}
                className="rounded-lg border border-slate-200 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className={`badge ${SIGNAL_COLOR[s.type]}`}>
                      {SIGNAL_LABEL[s.type]}
                    </span>
                    <p className="mt-1 font-medium">
                      {s.url ? (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                        >
                          {s.title}
                        </a>
                      ) : (
                        s.title
                      )}
                    </p>
                    <p className="text-sm text-slate-600">{s.description}</p>
                  </div>
                  <button
                    onClick={() => generateRecommendation(s.id)}
                    disabled={generatingFor === s.id}
                    className="btn btn-primary shrink-0"
                  >
                    {generatingFor === s.id
                      ? "Generuje..."
                      : "Zaproponuj kontakt"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {signals.length === 0 && (
          <button
            onClick={() => generateRecommendation(undefined)}
            disabled={generatingFor === "general"}
            className="btn btn-primary mt-3"
          >
            {generatingFor === "general"
              ? "Generuje..."
              : "Zaproponuj kontakt bez sygnalu"}
          </button>
        )}
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">
          Rekomendacje kontaktu {primaryContact ? `dla ${primaryContact.firstName} ${primaryContact.lastName}` : ""}
        </h2>
        {recommendations.length === 0 ? (
          <p className="text-sm text-slate-500">
            Brak jeszcze wygenerowanych propozycji. Wybierz sygnal powyzej i
            kliknij "Zaproponuj kontakt".
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {recommendations.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border border-slate-200 px-3 py-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">
                    {r.angle}
                  </p>
                  <span className="badge bg-slate-100 text-slate-600">
                    {r.generatedBy === "claude" ? "Claude" : "szablon"}
                  </span>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800">
                  {r.message}
                </pre>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
