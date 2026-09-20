/**
 * Free, key-less auto-discovery of companies that are actively hiring -
 * "aktywna rekrutacja" was named directly in the spec (answer #7/#12) as a
 * strong buy-now signal and a good way to find NEW companies, not just
 * check ones already on the list.
 *
 * Honest limitation: the only Polish job board we found with a public,
 * unauthenticated API (pracuj.pl and others return 403 / bot-block) is
 * nofluffjobs.com, which lists IT/tech/AI roles only - not every industry.
 * That happens to line up well with one of PIRSB's own offers (AI training
 * with EU funding), but it will miss hiring signals in non-tech roles.
 */

interface RawPosting {
  name?: string;
  title?: string;
  posted?: number;
  location?: { places?: { city?: string }[] };
}

export interface HiringLead {
  company: string;
  city?: string;
  roleTitle: string;
  postedAt: string;
  openRoles: number;
}

const NOFLUFFJOBS_URL = "https://nofluffjobs.com/api/posting";

/**
 * Fetches the full public postings feed once and groups it by company,
 * filtered by an optional free-text keyword (matched against the job
 * title) and/or city. Returns null on any fetch/parse failure so the
 * caller can show a clear "source unavailable" message instead of an
 * empty result.
 */
export async function findHiringLeads(
  keyword: string | undefined,
  cities: string[],
  limit = 30
): Promise<HiringLead[] | null> {
  try {
    const res = await fetch(NOFLUFFJOBS_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ProspectingCopilot/0.1)" },
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { postings?: RawPosting[] };
    const postings = data.postings ?? [];
    if (postings.length === 0) return null;

    const kw = keyword?.trim().toLowerCase();
    const wantedCities = cities.map((c) => c.toLowerCase());

    const grouped = new Map<string, HiringLead>();
    for (const p of postings) {
      const name = p.name?.trim();
      const title = p.title?.trim() ?? "";
      if (!name) continue;
      if (kw && !title.toLowerCase().includes(kw)) continue;

      const postingCities = (p.location?.places ?? [])
        .map((pl) => pl.city)
        .filter((c): c is string => Boolean(c));
      if (
        wantedCities.length > 0 &&
        !postingCities.some((c) => wantedCities.includes(c.toLowerCase()))
      ) {
        continue;
      }

      const postedAt = p.posted ? new Date(p.posted).toISOString() : new Date(0).toISOString();
      const existing = grouped.get(name);
      if (!existing) {
        grouped.set(name, {
          company: name,
          city: postingCities[0],
          roleTitle: title,
          postedAt,
          openRoles: 1,
        });
      } else {
        existing.openRoles += 1;
        if (postedAt > existing.postedAt) {
          existing.postedAt = postedAt;
          existing.roleTitle = title;
        }
      }
    }

    return [...grouped.values()]
      .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
      .slice(0, limit);
  } catch {
    return null;
  }
}

function slugCandidates(companyName: string): string[] {
  const clean = companyName
    .toLowerCase()
    .replace(/\b(sp\.?\s*z\s*o\.?\s*o\.?|s\.?a\.?|sp\.?\s*j\.?|sp\.?\s*k\.?)\b/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "");
  if (!clean) return [];
  return [`${clean}.pl`, `${clean}.com`];
}

/** Best-effort guess at a company's domain from its name, verified with a live HEAD/GET request. */
export async function guessDomain(companyName: string): Promise<string | null> {
  for (const domain of slugCandidates(companyName)) {
    try {
      const res = await fetch(`https://${domain}`, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(6000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ProspectingCopilot/0.1)" },
      });
      if (res.ok) return domain;
    } catch {
      // try next candidate
    }
  }
  return null;
}
