import type { Company, Signal } from "./types";
import { fetchJobPostings } from "./apollo";
import { classifyNewsSignal, fetchCompanyNews } from "./news";
import { newId } from "./store";

/**
 * Clay-style "what changed at this account" pass: pulls job postings (Apollo)
 * and public news mentions (Google News RSS) and turns them into Signal rows.
 * Returns an empty array - never a fabricated signal - when both sources
 * come back empty; the UI shows an honest "brak wykrytych sygnalow" state.
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

  return signals;
}
