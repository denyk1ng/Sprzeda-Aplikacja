import type { Contact } from "./types";
import { rankAndFlagPrimary, scoreTitle } from "./contact-utils";

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

/**
 * Enrich organization data by domain (Apollo "Organization Enrichment").
 * Returns an empty object - NEVER fabricated numbers - when Apollo has no
 * key or no match, so the UI can honestly show "nieznane" instead of a
 * plausible-looking but made-up industry/headcount.
 */
export async function enrichOrganization(domain: string): Promise<ApolloOrgInfo> {
  if (!hasApolloKey()) {
    return {};
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
    if (!org) return {};
    return {
      apolloOrgId: org.id,
      industry: org.industry,
      employeeCount: org.estimated_num_employees,
    };
  } catch {
    return {};
  }
}

/**
 * Find people at the organization matching the ICP target titles (Apollo "People Search").
 * Returns null when Apollo can't be used - e.g. no key, no org id, or the
 * endpoint is plan-restricted (People Search requires a paid Apollo plan) -
 * so the caller can fall through to the website-scraping discovery.
 */
export async function findDecisionMakers(
  companyId: string,
  domain: string,
  apolloOrgId: string | undefined,
  targetTitles: string[]
): Promise<Contact[] | null> {
  if (!hasApolloKey() || !apolloOrgId) {
    return null;
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
    if (!res.ok) return null; // e.g. 403 API_INACCESSIBLE on free plans
    const data = await res.json();
    const people: RawPerson[] = data.people ?? [];
    if (people.length === 0) return null;

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
      contactSource: "apollo",
      apolloPersonId: p.id,
      titleMatchScore: scoreTitle(p.title ?? "", targetTitles),
      isPrimary: false,
    }));

    rankAndFlagPrimary(contacts);
    return contacts;
  } catch {
    return null;
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
