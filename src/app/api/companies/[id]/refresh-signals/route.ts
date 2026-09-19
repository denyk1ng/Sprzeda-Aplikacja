import { NextRequest, NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/store";
import { collectSignals } from "@/lib/signals";

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

  const newSignals = await collectSignals(company);
  const existingTitles = new Set(
    db.signals.filter((s) => s.companyId === company.id).map((s) => s.title)
  );
  const toAdd = newSignals.filter((s) => !existingTitles.has(s.title));

  updateDb((d) => {
    d.signals.push(...toAdd);
    const target = d.companies.find((c) => c.id === company.id);
    if (target) target.lastSignalsRefreshAt = new Date().toISOString();
  });

  return NextResponse.json({ added: toAdd });
}
