"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type {
  Channel,
  Company,
  Contact,
  Priority,
  Recommendation,
  Signal,
  Stage,
} from "@/lib/types";
import { Markdown } from "@/components/Markdown";
import {
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  Calendar,
  Check,
  ChevronRight,
  Copy,
  DollarSign,
  Linkedin,
  Mail,
  Newspaper,
  Phone,
  RefreshCw,
  ScaleIcon,
  Search,
  Sparkles,
  Trash,
  UserSwitch,
  Users,
} from "@/components/icons";

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
const PRIORITY_BADGE: Record<Priority, string> = {
  high: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  medium: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  low: "bg-ink-100 text-ink-500 ring-1 ring-inset ring-ink-200",
};

const SIGNAL_META: Record<
  Signal["type"],
  { label: string; icon: React.ReactNode; className: string }
> = {
  job_posting: {
    label: "Rekrutacja",
    icon: <Briefcase className="h-4 w-4" />,
    className: "bg-blue-50 text-blue-600",
  },
  news: {
    label: "Wzmianka w mediach",
    icon: <Newspaper className="h-4 w-4" />,
    className: "bg-ink-100 text-ink-500",
  },
  funding: {
    label: "Finansowanie",
    icon: <DollarSign className="h-4 w-4" />,
    className: "bg-emerald-50 text-emerald-600",
  },
  leadership_change: {
    label: "Zmiana w zarzadzie",
    icon: <UserSwitch className="h-4 w-4" />,
    className: "bg-violet-50 text-violet-600",
  },
  manual: {
    label: "Recznie dodany",
    icon: <Sparkles className="h-4 w-4" />,
    className: "bg-amber-50 text-amber-600",
  },
};

const CHANNEL_META: Record<Channel, { label: string; icon: React.ReactNode }> = {
  phone: { label: "Telefon", icon: <Phone className="h-3.5 w-3.5" /> },
  email: { label: "E-mail", icon: <Mail className="h-3.5 w-3.5" /> },
  linkedin: { label: "LinkedIn", icon: <Linkedin className="h-3.5 w-3.5" /> },
};

// Kolejnosc preferowana wg specyfikacji (odp. #14): telefon -> e-mail -> LinkedIn.
const CHANNEL_ORDER: Channel[] = ["phone", "email", "linkedin"];

const STAGE_LABEL: Record<Stage, string> = {
  nowy: "Nowy",
  w_kontakcie: "W kontakcie",
  umowiona_rozmowa: "Umowiona rozmowa",
  wygrany: "Wygrany",
  przegrany: "Przegrany",
};

const CONTACT_SOURCE_BADGE: Record<string, string> = {
  apollo: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  website: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  demo: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
};
const CONTACT_SOURCE_LABEL: Record<string, string> = {
  apollo: "Apollo",
  website: "strona firmy",
  demo: "demo",
};

const AVATAR_COLORS = [
  "bg-brand-100 text-brand-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
];

function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

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
  const [researching, setResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savingStage, setSavingStage] = useState(false);
  const [nextStepAt, setNextStepAt] = useState("");
  const [nextStepNote, setNextStepNote] = useState("");

  async function load() {
    const res = await fetch(`/api/companies/${params.id}`);
    if (!res.ok) {
      setData(null);
      return;
    }
    const body = (await res.json()) as DetailResponse;
    setData(body);
    setNextStepAt(body.company.nextStepAt?.slice(0, 10) ?? "");
    setNextStepNote(body.company.nextStepNote ?? "");
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function refreshSignals() {
    setRefreshing(true);
    await fetch(`/api/companies/${params.id}/refresh-signals`, { method: "POST" });
    await load();
    setRefreshing(false);
  }

  async function generateRecommendation(signalId?: string, channel?: Channel) {
    setGeneratingFor(`${signalId ?? "general"}:${channel ?? "all"}`);
    await fetch(`/api/companies/${params.id}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signalId, channel }),
    });
    await load();
    setGeneratingFor(null);
  }

  async function saveStage(patch: {
    stage?: Stage;
    nextStepAt?: string;
    nextStepNote?: string;
  }) {
    setSavingStage(true);
    await fetch(`/api/companies/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await load();
    setSavingStage(false);
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

  async function runResearch() {
    setResearching(true);
    setResearchError(null);
    const res = await fetch(`/api/companies/${params.id}/research`, { method: "POST" });
    const body = await res.json();
    setResearching(false);
    if (!res.ok) {
      setResearchError(body.error ?? "Nie udalo sie zbadac firmy");
      return;
    }
    await load();
  }

  async function deleteCompany() {
    if (!confirm("Usunac te firme wraz z kontaktami i historia?")) return;
    setDeleting(true);
    await fetch(`/api/companies/${params.id}`, { method: "DELETE" });
    router.push("/");
  }

  async function copyMessage(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // clipboard API unavailable - silently ignore, the text is still visible to copy manually
    }
  }

  if (!data) return <div className="card h-40 animate-pulse bg-ink-50" />;

  const { company, contacts, signals, recommendations } = data;
  const primaryContact = contacts.find((c) => c.isPrimary);
  const sortedContacts = [...contacts].sort((a, b) => b.titleMatchScore - a.titleMatchScore);

  return (
    <div className="flex flex-col gap-6 animate-in">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1 text-[13px] font-medium text-ink-500 hover:text-ink-800"
      >
        <ChevronRight className="h-3.5 w-3.5 rotate-180" />
        Konta
      </Link>

      <section className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink-900">{company.name}</h1>
          <p className="text-sm text-ink-500">{company.domain}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {company.industry && <span className="badge bg-ink-100 text-ink-600">{company.industry}</span>}
            {company.employeeCount && (
              <span className="badge bg-ink-100 text-ink-600">{company.employeeCount} pracownikow</span>
            )}
            {company.priority && (
              <span className={`badge ${PRIORITY_BADGE[company.priority]}`}>
                {PRIORITY_LABEL[company.priority]}
              </span>
            )}
          </div>
          {company.priorityReason && (
            <p className="mt-2 max-w-xl text-xs text-ink-400">{company.priorityReason}</p>
          )}
        </div>
        <button onClick={deleteCompany} disabled={deleting} className="btn btn-danger shrink-0">
          <Trash className="h-3.5 w-3.5" />
          Usun
        </button>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-ink-400" />
          <h2 className="section-title">Status i nastepny krok</h2>
        </div>
        <p className="mb-3 text-xs text-ink-500">
          Ty prowadzisz ten proces recznie - narzedzie tylko zapamietuje, na
          jakim jest etapie i kiedy chcesz wrocic do kontaktu.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="label">Etap</span>
            <select
              className="input"
              value={company.stage ?? "nowy"}
              onChange={(e) => saveStage({ stage: e.target.value as Stage })}
              disabled={savingStage}
            >
              {Object.entries(STAGE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label">Nastepny krok - data</span>
            <input
              type="date"
              className="input"
              value={nextStepAt}
              onChange={(e) => setNextStepAt(e.target.value)}
            />
          </label>
          <label className="flex flex-1 min-w-[180px] flex-col gap-1.5">
            <span className="label">Notatka</span>
            <input
              className="input"
              placeholder="np. oddzwonic po 15:00"
              value={nextStepNote}
              onChange={(e) => setNextStepNote(e.target.value)}
            />
          </label>
          <button
            onClick={() =>
              saveStage({
                nextStepAt: (nextStepAt || null) as unknown as string | undefined,
                nextStepNote: (nextStepNote || null) as unknown as string | undefined,
              })
            }
            disabled={savingStage}
            className="btn btn-secondary"
          >
            {savingStage ? "Zapisuje..." : "Zapisz"}
          </button>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <ScaleIcon className="h-4 w-4 text-ink-400" />
          <h2 className="section-title">Weryfikacja w KRS</h2>
        </div>
        <p className="mt-1 text-xs text-ink-500">
          Numer KRS wpisujesz recznie (nie da sie go znalezc automatycznie po
          domenie). Pobieramy fakty rejestrowe z publicznego API Ministerstwa
          Sprawiedliwosci; wykrycie likwidacji/upadlosci jest orientacyjne.
        </p>
        {company.krsNumber ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="badge bg-ink-100 text-ink-600">KRS {company.krsNumber}</span>
            {company.krsLegalForm && (
              <span className="badge bg-ink-100 text-ink-600">{company.krsLegalForm}</span>
            )}
            {company.krsRegisteredAt && (
              <span className="badge bg-ink-100 text-ink-600">
                zarejestrowana {company.krsRegisteredAt}
              </span>
            )}
            {company.krsLegalFlag && (
              <span className="badge bg-red-50 text-red-700 ring-1 ring-inset ring-red-200">
                <AlertTriangle className="h-3 w-3" />
                {company.krsLegalFlag === "upadlosc" ? "Upadlosc (wg KRS)" : "W likwidacji (wg KRS)"}
              </span>
            )}
            <a
              href="https://ekrs.ms.gov.pl/web/wyszukiwarka-krs/strona-glowna/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-brand-600 hover:underline"
            >
              pelny odpis <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
        ) : (
          <form onSubmit={checkKrs} className="mt-3 flex flex-wrap gap-2">
            <input
              className="input min-w-[160px] flex-1 sm:flex-none sm:w-56"
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

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-ink-400" />
            <h2 className="section-title">Badanie firmy w sieci</h2>
          </div>
          <button onClick={runResearch} disabled={researching} className="btn btn-primary">
            {researching ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {researching
              ? "Badam..."
              : company.webResearch
              ? "Zbadaj ponownie"
              : "Zbadaj firme w sieci"}
          </button>
        </div>
        <p className="mt-1 text-xs text-ink-500">
          Claude przeszuka internet i zlozy pelny raport: czym firma sie
          zajmuje, ostatnie wydarzenia, obecnosc medialna i konkretny pretekst
          do kontaktu.
        </p>
        {researchError && <p className="mt-2 text-sm text-red-600">{researchError}</p>}
        {researching && !company.webResearch && (
          <div className="mt-4 flex flex-col gap-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-ink-100" />
            <div className="h-3 w-full animate-pulse rounded bg-ink-100" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-ink-100" />
          </div>
        )}
        {company.webResearch && (
          <div className="mt-4 rounded-xl border border-ink-100 bg-ink-50/60 p-4">
            <Markdown text={company.webResearch} />
            {company.webResearchAt && (
              <p className="mt-3 text-[11px] text-ink-400">
                Zaktualizowano: {new Date(company.webResearchAt).toLocaleString("pl-PL")}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="card p-5 sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-ink-400" />
          <h2 className="section-title">Kontakty decyzyjne</h2>
        </div>
        {contacts.length === 0 ? (
          <p className="text-sm text-ink-500">Brak znalezionych kontaktow.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedContacts.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-ink-100 px-3.5 py-3"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarColor(
                    c.id
                  )}`}
                >
                  {(c.firstName[0] ?? "?") + (c.lastName[0] ?? "")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 font-semibold text-ink-900">
                    {c.firstName} {c.lastName}
                    {c.isPrimary && (
                      <span className="badge bg-ink-900 text-white">Rekomendowany</span>
                    )}
                  </p>
                  <p className="flex flex-wrap items-center gap-1.5 text-[13px] text-ink-500">
                    {c.title}
                    {c.contactSource && (
                      <span className={`badge ${CONTACT_SOURCE_BADGE[c.contactSource] ?? ""}`}>
                        {CONTACT_SOURCE_LABEL[c.contactSource] ?? c.contactSource}
                      </span>
                    )}
                  </p>
                  {c.phone && (
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-medium text-ink-600">
                      <Phone className="h-3 w-3" />
                      <a href={`tel:${c.phone}`} className="hover:underline">
                        {c.phone}
                      </a>
                    </p>
                  )}
                  {c.email && (
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-400">
                      <Mail className="h-3 w-3" />
                      {c.email}
                      <span
                        className={`badge ${
                          c.emailStatus === "verified"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                            : "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
                        }`}
                      >
                        {c.emailStatus === "verified" ? "zweryfikowany" : "przypuszczalny"}
                      </span>
                    </p>
                  )}
                </div>
                {c.linkedinUrl && (
                  <a
                    href={c.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost shrink-0"
                  >
                    LinkedIn
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">Sygnaly zmian u klienta</h2>
          <button onClick={refreshSignals} disabled={refreshing} className="btn btn-secondary">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Sprawdzam..." : "Odswiez sygnaly"}
          </button>
        </div>
        {signals.length === 0 ? (
          <p className="text-sm text-ink-500">
            Brak wykrytych sygnalow. Kliknij "Odswiez sygnaly", aby sprawdzic
            rekrutacje i wzmianki w mediach.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {signals.map((s) => {
              const meta = SIGNAL_META[s.type];
              return (
                <div key={s.id} className="rounded-xl border border-ink-100 px-3.5 py-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.className}`}
                    >
                      {meta.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="badge bg-ink-100 text-ink-500">{meta.label}</span>
                      <p className="mt-1 font-medium text-ink-900">
                        {s.url ? (
                          <a href={s.url} target="_blank" rel="noreferrer" className="hover:underline">
                            {s.title}
                          </a>
                        ) : (
                          s.title
                        )}
                      </p>
                      <p className="mt-0.5 text-[13px] text-ink-500">{s.description}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      {CHANNEL_ORDER.map((channel) => {
                        const key = `${s.id}:${channel}`;
                        return (
                          <button
                            key={channel}
                            onClick={() => generateRecommendation(s.id, channel)}
                            disabled={generatingFor === key}
                            className="btn btn-secondary !px-2.5 !py-1.5 text-xs"
                            title={`Wygeneruj tresc na ${CHANNEL_META[channel].label}`}
                          >
                            {CHANNEL_META[channel].icon}
                            {generatingFor === key ? "..." : CHANNEL_META[channel].label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {signals.length === 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {CHANNEL_ORDER.map((channel) => {
              const key = `general:${channel}`;
              return (
                <button
                  key={channel}
                  onClick={() => generateRecommendation(undefined, channel)}
                  disabled={generatingFor === key}
                  className="btn btn-primary"
                >
                  {CHANNEL_META[channel].icon}
                  {generatingFor === key
                    ? "Generuje..."
                    : `${CHANNEL_META[channel].label} bez sygnalu`}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="section-title">
          Rekomendacje kontaktu
          {primaryContact ? ` dla ${primaryContact.firstName} ${primaryContact.lastName}` : ""}
        </h2>
        {recommendations.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">
            Brak jeszcze wygenerowanych propozycji. Wybierz sygnal powyzej i
            kliknij "Zaproponuj kontakt".
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {recommendations.map((r) => (
              <div key={r.id} className="rounded-xl border border-ink-100 p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <p className="text-[13px] font-semibold text-ink-700">{r.angle}</p>
                  <div className="flex shrink-0 gap-1.5">
                    <span className="badge bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200">
                      {CHANNEL_META[r.channel]?.icon}
                      {CHANNEL_META[r.channel]?.label ?? r.channel}
                    </span>
                    <span className="badge bg-ink-100 text-ink-500">
                      {r.generatedBy === "claude" && <Sparkles className="h-3 w-3" />}
                      {r.generatedBy === "claude" ? "Claude" : "szablon"}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg bg-ink-50/70 p-3.5">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-800">
                    {r.message}
                  </pre>
                </div>
                <button
                  onClick={() => copyMessage(r.id, r.message)}
                  className="btn btn-ghost mt-2 !px-2 !py-1 text-xs"
                >
                  {copiedId === r.id ? (
                    <>
                      <Check className="h-3 w-3" /> Skopiowano
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Kopiuj
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
