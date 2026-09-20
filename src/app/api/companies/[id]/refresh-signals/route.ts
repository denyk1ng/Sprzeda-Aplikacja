import { NextRequest, NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/store";
import { collectSignals } from "@/lib/signals";
import { computePriority } from "@/lib/priority";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = readDb();
  const company = db.companies.find((c) => c.id === id);
  if (!company) {
    return NextResponse.json({ error: "Nie znaleziono firmy" }, { status: 404 });
  }

  const existingSignals = db.signals.filter((s) => s.companyId === company.id);
  const contacts = db.contacts.filter((c) => c.companyId === company.id);

  const freshSignals = await collectSignals(company);
  const existingTitles = new Set(existingSignals.map((s) => s.title));
  const toAdd = freshSignals.filter((s) => !existingTitles.has(s.title));

  const { level, reason } = computePriority(company, contacts, [
    ...existingSignals,
    ...toAdd,
  ]);

  updateDb((d) => {
    d.signals.push(...toAdd);
    const target = d.companies.find((c) => c.id === company.id);
    if (target) {
      target.lastSignalsRefreshAt = new Date().toISOString();
      target.priority = level;
      target.priorityReason = reason;
    }
  });

  return NextResponse.json({ added: toAdd });
}
