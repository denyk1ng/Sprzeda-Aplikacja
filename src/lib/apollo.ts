import type { Contact } from "./types";

const APOLLO_BASE = "https://api.apollo.io/api/v1";

export interface ApolloOrgInfo {
  apolloOrgId?: string;
  industry?: string;
  employeeCount?: number;
}

interface RawPerson {
  id: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  linkedin_url?: string;
  email?: string;
  email_status?: string;
}

function hasApolloKey(): boolean {
  return Boolean(process.env.APOLLO_API_KEY);
}

/** Enrich organization data by domain (Apollo "Organization Enrichment"). */
export async function enrichOrganization(domain: string): Promise<ApolloOrgInfo> {
  if (!hasApolloKey()) {
    return demoOrgInfo(domain);
  }
  try {
    const res = await fetch(
      `${APOLLO_BASE}/organizations/enrich?domain=${encodeURIComponent(domain)}`,
      {
        headers: {
          "X-Api-Key": process.env.APOLLO_API_KEY as string,
          Accept: "application/json",
        },
      }
    );
    if (!res.ok) throw new Error(`Apollo org enrich failed: ${res.status}`);
    const data = await res.json();
    const org = data.organization;
    if (!org) return demoOrgInfo(domain);
    return {
      apolloOrgId: org.id,
      industry: org.industry,
      employeeCount: org.estimated_num_employees,
    };
  } catch {
    return demoOrgInfo(domain);
  }
}

/**
 * Find people at the organization matching the ICP target titles (Apollo "People Search"),
 * scored and sorted so the best-fit decision maker comes first.
 */
export async function findDecisionMakers(
  companyId: string,
  domain: string,
  apolloOrgId: string | undefined,
  targetTitles: string[]
): Promise<Contact[]> {
  if (!hasApolloKey() || !apolloOrgId) {
    return demoContacts(companyId, domain, targetTitles);
  }
  try {
    const res = await fetch(`${APOLLO_BASE}/mixed_people/search`, {
      method: "POST",
      headers: {
        "X-Api-Key": process.env.APOLLO_API_KEY as string,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        organization_ids: [apolloOrgId],
        person_titles: targetTitles,
        page: 1,
        per_page: 10,
      }),
    });
    if (!res.ok) throw new Error(`Apollo people search failed: ${res.status}`);
    const data = await res.json();
    const people: RawPerson[] = data.people ?? [];
    if (people.length === 0) return demoContacts(companyId, domain, targetTitles);

    const contacts: Contact[] = people.map((p) => ({
      id: `contact_${p.id}`,
      companyId,
      firstName: p.first_name ?? "",
      lastName: p.last_name ?? "",
      title: p.title ?? "",
      linkedinUrl: p.linkedin_url,
      email: p.email,
      emailStatus:
        p.email_status === "verified"
          ? "verified"
          : p.email ? "guessed" : "unknown",
      emailSource: p.email ? "apollo" : undefined,
      apolloPersonId: p.id,
      titleMatchScore: scoreTitle(p.title ?? "", targetTitles),
      isPrimary: false,
    }));

    rankAndFlagPrimary(contacts);
    return contacts;
  } catch {
    return demoContacts(companyId, domain, targetTitles);
  }
}

/** Job postings signal source (Apollo "Organization Job Postings"). */
export async function fetchJobPostings(
  apolloOrgId: string | undefined
): Promise<{ title: string; url?: string; postedAt?: string }[]> {
  if (!hasApolloKey() || !apolloOrgId) return [];
  try {
    const res = await fetch(
      `${APOLLO_BASE}/organizations/${apolloOrgId}/job_postings`,
      {
        headers: {
          "X-Api-Key": process.env.APOLLO_API_KEY as string,
          Accept: "application/json",
        },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const postings = data.organization_job_postings ?? [];
    return postings.map((jp: any) => ({
      title: jp.title,
      url: jp.url,
      postedAt: jp.posted_at,
    }));
  } catch {
    return [];
  }
}

export function scoreTitle(title: string, targetTitles: string[]): number {
  const t = title.toLowerCase();
  let best = 0;
  for (const target of targetTitles) {
    const tt = target.toLowerCase();
    if (t === tt) best = Math.max(best, 100);
    else if (t.includes(tt) || tt.includes(t)) best = Math.max(best, 70);
    else {
      const words = tt.split(/\s+/);
      const hits = words.filter((w) => t.includes(w)).length;
      if (hits > 0) best = Math.max(best, Math.round((hits / words.length) * 50));
    }
  }
  return best;
}

export function rankAndFlagPrimary(contacts: Contact[]) {
  contacts.sort((a, b) => b.titleMatchScore - a.titleMatchScore);
  contacts.forEach((c, i) => (c.isPrimary = i === 0));
}

function demoOrgInfo(domain: string): ApolloOrgInfo {
  const seed = hashSeed(domain);
  const industries = ["SaaS", "E-commerce", "Fintech", "Manufacturing", "Logistics"];
  return {
    apolloOrgId: undefined,
    industry: industries[seed % industries.length],
    employeeCount: 20 + (seed % 480),
  };
}

const DEMO_PEOPLE = [
  { first: "Anna", last: "Kowalska", title: "Head of Sales" },
  { first: "Marcin", last: "Nowak", title: "VP Sales" },
  { first: "Katarzyna", last: "Wisniewska", title: "Sales Director" },
  { first: "Piotr", last: "Zielinski", title: "CEO" },
  { first: "Tomasz", last: "Lewandowski", title: "Head of Growth" },
  { first: "Agnieszka", last: "Wojcik", title: "Revenue Operations Manager" },
];

function demoContacts(
  companyId: string,
  domain: string,
  targetTitles: string[]
): Contact[] {
  const seed = hashSeed(domain);
  const picked = [
    DEMO_PEOPLE[seed % DEMO_PEOPLE.length],
    DEMO_PEOPLE[(seed + 2) % DEMO_PEOPLE.length],
  ];
  const contacts: Contact[] = picked.map((p, i) => ({
    id: `contact_demo_${domain}_${i}`,
    companyId,
    firstName: p.first,
    lastName: p.last,
    title: p.title,
    linkedinUrl: `https://www.linkedin.com/in/${p.first.toLowerCase()}-${p.last.toLowerCase()}`,
    email: undefined,
    emailStatus: "unknown",
    emailSource: undefined,
    apolloPersonId: undefined,
    titleMatchScore: scoreTitle(p.title, targetTitles),
    isPrimary: false,
  }));
  rankAndFlagPrimary(contacts);
  return contacts;
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
