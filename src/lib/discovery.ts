import type { Contact } from "./types";
import { rankAndFlagPrimary, scoreTitle } from "./contact-utils";

/**
 * Free, key-less fallback for finding decision makers when Apollo's People
 * Search is unavailable (no key, or plan-restricted). It scrapes the
 * company's OWN public website - the "About us" / "Team" / "Leadership"
 * pages companies publish themselves - and extracts real names + titles
 * from structured data (schema.org Person) or common page markup. This
 * intentionally stays within the company's own marketing site; it does not
 * touch LinkedIn or any login-gated source.
 */

const TEAM_PAGE_KEYWORDS: { pattern: RegExp; weight: number }[] = [
  { pattern: /leadership|management-team|our-team|meet-the-team/i, weight: 3 },
  { pattern: /\bteam\b|zespol|kierownictwo|zarzad|wladze/i, weight: 2 },
  { pattern: /about-us|about|o-nas|poznaj-nas|company/i, weight: 1 },
];

async function fetchWithTimeout(url: string, ms = 8000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ProspectingCopilot/0.1)" },
      signal: AbortSignal.timeout(ms),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, 400_000);
  } catch {
    return null;
  }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function findTeamPageUrls(baseUrl: string, html: string): Promise<string[]> {
  const linkRe = /<a\s[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const scored: { url: string; weight: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(html)) !== null) {
    const href = match[1];
    const text = stripTags(match[2]);
    const haystack = `${href} ${text}`;
    for (const { pattern, weight } of TEAM_PAGE_KEYWORDS) {
      if (pattern.test(haystack)) {
        try {
          const abs = new URL(href, baseUrl).toString();
          scored.push({ url: abs, weight });
        } catch {
          // ignore malformed hrefs
        }
        break;
      }
    }
  }
  const bySameHost = scored.filter((s) => {
    try {
      return new URL(s.url).host === new URL(baseUrl).host;
    } catch {
      return false;
    }
  });
  const unique = new Map<string, number>();
  for (const s of bySameHost) {
    unique.set(s.url, Math.max(unique.get(s.url) ?? 0, s.weight));
  }
  return [...unique.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([url]) => url);
}

interface RawPersonFind {
  name: string;
  title: string;
  phone?: string;
}

const TEL_RE = /tel:([+\d][\d\s\-()]{5,20})/i;

function extractFromJsonLd(html: string): RawPersonFind[] {
  const found: RawPersonFind[] = [];
  const blockRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      collectPersons(parsed, found);
    } catch {
      // not valid JSON, skip
    }
  }
  return found;
}

function collectPersons(
  node: unknown,
  out: RawPersonFind[],
  parentKey?: string
) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) collectPersons(item, out, parentKey);
    return;
  }
  if (typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const type = obj["@type"];
  const isPerson =
    type === "Person" || (Array.isArray(type) && type.includes("Person"));
  if (isPerson && typeof obj.name === "string") {
    const explicitTitle =
      typeof obj.jobTitle === "string" ? obj.jobTitle.trim() : "";
    // schema.org "founder" relationship on an Organization is itself a real
    // role signal even when the nested Person has no jobTitle of its own.
    const inferredTitle =
      !explicitTitle && parentKey === "founder" ? "Founder" : "";
    const title = explicitTitle || inferredTitle;
    const phone =
      typeof obj.telephone === "string" ? obj.telephone.trim() : undefined;
    if (title) out.push({ name: obj.name, title, phone });
  }
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === "object") collectPersons(value, out, key);
  }
}

const NAME_SHAPE =
  /^[A-ZŁŚŻŹĆŃÓĄĘÅÄÖ][\wąćęłńóśźżÅåÄäÖö'-]+(?:\s+[A-ZŁŚŻŹĆŃÓĄĘÅÄÖ][\wąćęłńóśźżÅåÄäÖö'-]+){1,2}$/;

/**
 * Team-card pages usually render "Name" inside a heading (often wrapped in a
 * button/link) immediately followed by a short "<p>Title</p>" - regardless
 * of exactly how the name element is nested. We scan headings for something
 * name-shaped, then look at the very next <p> for the role.
 */
function extractFromHeuristics(html: string): RawPersonFind[] {
  const found: RawPersonFind[] = [];
  const headingRe = /<h[2-6][^>]*>([\s\S]*?)<\/h[2-6]>/gi;
  let match: RegExpExecArray | null;
  let count = 0;
  while ((match = headingRe.exec(html)) !== null && count < 80) {
    const name = stripTags(match[1]).trim();
    if (!NAME_SHAPE.test(name)) continue;
    const tailStart = match.index + match[0].length;
    const tail = html.slice(tailStart, tailStart + 400);
    const pMatch = tail.match(/<p[^>]*>([^<]{3,100})<\/p>/i);
    if (!pMatch) continue;
    const title = pMatch[1].trim();
    if (!title || /^[\d\s,.\-]+$/.test(title)) continue;
    const telMatch = tail.match(TEL_RE);
    const phone = telMatch ? telMatch[1].trim() : undefined;
    found.push({ name, title, phone });
    count++;
  }
  return found;
}

function toContact(
  companyId: string,
  domain: string,
  index: number,
  person: RawPersonFind,
  targetTitles: string[]
): Contact {
  const parts = person.name.trim().split(/\s+/);
  const firstName = parts[0] ?? person.name;
  const lastName = parts.slice(1).join(" ") || "";
  return {
    id: `contact_web_${domain}_${index}`,
    companyId,
    firstName,
    lastName,
    title: person.title || "Nieznane stanowisko",
    phone: person.phone,
    email: undefined,
    emailStatus: "unknown",
    emailSource: undefined,
    contactSource: "website",
    apolloPersonId: undefined,
    titleMatchScore: scoreTitle(person.title, targetTitles),
    isPrimary: false,
  };
}

/**
 * Scans the company's own site for a team/about/leadership page and pulls
 * real names + titles from it. Returns null when no page or no plausible
 * people could be found, so the caller can prompt the user to add one manually.
 */
export async function discoverContactsFromWebsite(
  companyId: string,
  domain: string,
  targetTitles: string[]
): Promise<Contact[] | null> {
  const baseUrl = `https://${domain}`;
  const homeHtml = await fetchWithTimeout(baseUrl);
  if (!homeHtml) return null;

  const candidateUrls = await findTeamPageUrls(baseUrl, homeHtml);
  const pagesToScan = candidateUrls.length > 0 ? candidateUrls : [baseUrl];

  const rawPeople: RawPersonFind[] = [];
  for (const url of pagesToScan) {
    const html = url === baseUrl ? homeHtml : await fetchWithTimeout(url);
    if (!html) continue;
    rawPeople.push(...extractFromJsonLd(html));
    rawPeople.push(...extractFromHeuristics(html));
  }

  const seenNames = new Set<string>();
  const deduped = rawPeople.filter((p) => {
    const key = p.name.toLowerCase();
    if (seenNames.has(key)) return false;
    seenNames.add(key);
    return true;
  });

  const scored = deduped
    .map((p) => ({ ...p, score: scoreTitle(p.title, targetTitles) }))
    .filter((p) => p.score >= 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (scored.length === 0) return null;

  const contacts = scored.map((p, i) =>
    toContact(companyId, domain, i, p, targetTitles)
  );
  rankAndFlagPrimary(contacts);
  return contacts;
}
