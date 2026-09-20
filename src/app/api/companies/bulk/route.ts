import { NextRequest, NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/store";
import {
  buildCompanyFromDomain,
  enrichCompanyContacts,
  normalizeDomain,
} from "@/lib/enrich-company";
import { computePriority } from "@/lib/priority";
import type { Company, Contact } from "@/lib/types";

const MAX_BATCH = 30;

/**
 * Bulk import: paste many domains at once. Runs the same enrichment
 * waterfall as the single-add endpoint, sequentially (so we don't hammer
 * Apollo / the target websites with parallel requests), and reports a
 * per-domain outcome instead of failing the whole batch on one bad entry.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { domains?: string[] };
  const rawDomains = body.domains ?? [];
  if (!Array.isArray(rawDomains) || rawDomains.length === 0) {
    return NextResponse.json(
      { error: "Podaj przynajmniej jedna domene" },
      { status: 400 }
    );
  }
  if (rawDomains.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `Maksymalnie ${MAX_BATCH} domen na raz` },
      { status: 400 }
    );
  }

  const db = await readDb();
  const existingDomains = new Set(db.companies.map((c) => c.domain));

  const added: Company[] = [];
  const skipped: string[] = [];
  const failed: { domain: string; error: string }[] = [];
  const newContacts: Contact[] = [];

  for (const raw of rawDomains) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const domain = normalizeDomain(trimmed);
    if (!domain) continue;

    if (existingDomains.has(domain)) {
      skipped.push(domain);
      continue;
    }
    existingDomains.add(domain);

    try {
      const company = await buildCompanyFromDomain(domain, undefined);
      const contacts = await enrichCompanyContacts(company, db.icp.targetTitles);
      const { level, reason } = computePriority(company, contacts, []);
      company.priority = level;
      company.priorityReason = reason;
      company.lastVerifiedAt = new Date().toISOString();
      added.push(company);
      newContacts.push(...contacts);
    } catch (err) {
      failed.push({
        domain,
        error: err instanceof Error ? err.message : "Nieznany blad",
      });
    }
  }

  if (added.length > 0) {
    await updateDb((d) => {
      d.companies.push(...added);
      d.contacts.push(...newContacts);
    });
  }

  return NextResponse.json({ added, skipped, failed });
}
