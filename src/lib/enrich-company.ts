import { enrichOrganization, findDecisionMakers } from "./apollo";
import { discoverContactsFromWebsite } from "./discovery";
import { findAndVerifyEmail } from "./snov";
import { newId } from "./store";
import type { Company, Contact } from "./types";

export function normalizeDomain(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
}

/** Builds a fresh Company record from a domain via Apollo Organization Enrichment. */
export async function buildCompanyFromDomain(
  domain: string,
  name: string | undefined
): Promise<Company> {
  const orgInfo = await enrichOrganization(domain);
  const now = new Date().toISOString();
  return {
    id: newId("co"),
    name: name?.trim() || domain,
    domain,
    industry: orgInfo.industry,
    employeeCount: orgInfo.employeeCount,
    apolloOrgId: orgInfo.apolloOrgId,
    createdAt: now,
    lastEnrichedAt: now,
  };
}

/**
 * Waterfall: Apollo People Search (paid plans) -> our own website scraper
 * (free). Returns an EMPTY array - never fabricated people - when neither
 * finds a real person; the UI then prompts the user to add one manually
 * (see manualContact in contact-utils.ts). Shared by single-add, bulk-add,
 * and "verify all" so the same logic never drifts between call sites.
 */
export async function enrichCompanyContacts(
  company: Company,
  targetTitles: string[]
): Promise<Contact[]> {
  const contacts =
    (await findDecisionMakers(
      company.id,
      company.domain,
      company.apolloOrgId,
      targetTitles
    )) ??
    (await discoverContactsFromWebsite(company.id, company.domain, targetTitles)) ??
    [];

  for (const contact of contacts) {
    if (!contact.email || contact.emailStatus !== "verified") {
      const found = await findAndVerifyEmail(
        contact.firstName,
        contact.lastName,
        company.domain
      );
      contact.email = found.email;
      contact.emailStatus = found.status;
      contact.emailSource = found.source;
    }
  }

  return contacts;
}
