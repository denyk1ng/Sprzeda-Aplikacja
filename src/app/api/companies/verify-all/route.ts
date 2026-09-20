import { NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/store";
import { enrichOrganization } from "@/lib/apollo";
import { enrichCompanyContacts } from "@/lib/enrich-company";
import { collectSignals } from "@/lib/signals";
import { computePriority } from "@/lib/priority";
import type { Company, Contact, Signal } from "@/lib/types";

interface VerifyResult {
  companyId: string;
  name: string;
  priority: string;
  newSignals: number;
}

/**
 * "Weryfikuj wszystko": re-runs org enrichment, the contact waterfall, and
 * signal collection for every stored company in one go, then recomputes
 * each company's priority. Sequential on purpose - it's a background/batch
 * action a user triggers occasionally, not a hot path, so we'd rather be
 * gentle with Apollo/website rate limits than fast.
 */
export async function POST() {
  const db = await readDb();
  const targetTitles = db.icp.targetTitles;

  const results: VerifyResult[] = [];
  const updatedCompanies: Company[] = [];
  const contactsByCompany = new Map<string, Contact[]>();
  const newSignalsByCompany = new Map<string, Signal[]>();

  for (const company of db.companies) {
    const orgInfo = await enrichOrganization(company.domain);
    const updated: Company = {
      ...company,
      industry: orgInfo.industry ?? company.industry,
      employeeCount: orgInfo.employeeCount ?? company.employeeCount,
      apolloOrgId: orgInfo.apolloOrgId ?? company.apolloOrgId,
      lastEnrichedAt: new Date().toISOString(),
    };

    const contacts = await enrichCompanyContacts(updated, targetTitles);
    contactsByCompany.set(company.id, contacts);

    const existingSignals = db.signals.filter((s) => s.companyId === company.id);
    const freshSignals = await collectSignals(updated);
    const existingTitles = new Set(existingSignals.map((s) => s.title));
    const toAdd = freshSignals.filter((s) => !existingTitles.has(s.title));
    newSignalsByCompany.set(company.id, toAdd);
    updated.lastSignalsRefreshAt = new Date().toISOString();

    const { level, reason } = computePriority(updated, contacts, [
      ...existingSignals,
      ...toAdd,
    ]);
    updated.priority = level;
    updated.priorityReason = reason;
    updated.lastVerifiedAt = new Date().toISOString();

    updatedCompanies.push(updated);
    results.push({
      companyId: company.id,
      name: company.name,
      priority: level,
      newSignals: toAdd.length,
    });
  }

  await updateDb((d) => {
    const updatedIds = new Set(updatedCompanies.map((c) => c.id));
    d.companies = updatedCompanies;
    d.contacts = d.contacts.filter((c) => !updatedIds.has(c.companyId));
    for (const company of updatedCompanies) {
      d.contacts.push(...(contactsByCompany.get(company.id) ?? []));
      d.signals.push(...(newSignalsByCompany.get(company.id) ?? []));
    }
  });

  return NextResponse.json({ results });
}
