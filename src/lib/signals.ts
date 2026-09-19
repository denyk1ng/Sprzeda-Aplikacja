import type { Company, Signal } from "./types";
import { fetchJobPostings } from "./apollo";
import { classifyNewsSignal, fetchCompanyNews } from "./news";
import { newId } from "./store";

/**
 * Clay-style "what changed at this account" pass: pulls job postings (Apollo)
 * and public news mentions (Google News RSS) and turns them into Signal rows.
 * Falls back to a plausible demo signal when both sources come back empty,
 * so the recommendation flow is always testable without paid keys.
 */
export async function collectSignals(company: Company): Promise<Signal[]> {
  const signals: Signal[] = [];

  const jobPostings = await fetchJobPostings(company.apolloOrgId);
  for (const jp of jobPostings.slice(0, 3)) {
    signals.push({
      id: newId("sig"),
      companyId: company.id,
      type: "job_posting",
      title: `Nowa rekrutacja: ${jp.title}`,
      description: `${company.name} aktywnie rekrutuje na stanowisko "${jp.title}" — to sygnal zmiany w zespole/procesie.`,
      url: jp.url,
      source: "apollo_job_postings",
      detectedAt: jp.postedAt ?? new Date().toISOString(),
    });
  }

  const news = await fetchCompanyNews(company.name);
  for (const n of news.slice(0, 3)) {
    signals.push({
      id: newId("sig"),
      companyId: company.id,
      type: classifyNewsSignal(n.title),
      title: n.title,
      description: `Wzmianka w mediach o ${company.name}.`,
      url: n.url,
      source: "google_news",
      detectedAt: n.publishedAt ?? new Date().toISOString(),
    });
  }

  if (signals.length === 0) {
    signals.push(...demoSignals(company));
  }

  return signals;
}

function demoSignals(company: Company): Signal[] {
  const templates = [
    {
      type: "job_posting" as const,
      title: `Nowa rekrutacja: Sales Development Representative`,
      description: `${company.name} otworzyl(a) rekrutacje na SDR — sygnal, ze zespol sprzedazy rosnie i moze brakowac procesow/narzedzi do skalowania.`,
    },
    {
      type: "funding" as const,
      title: `${company.name} pozyskuje nowe finansowanie`,
      description: `Firma weszla w nowa runde finansowania — dobry moment na rozmowe o inwestycji w narzedzia wspierajace wzrost.`,
    },
  ];
  const seed = company.domain.length % templates.length;
  const t = templates[seed];
  return [
    {
      id: newId("sig"),
      companyId: company.id,
      type: t.type,
      title: t.title,
      description: `[DEMO] ${t.description}`,
      source: "demo",
      detectedAt: new Date().toISOString(),
    },
  ];
}
