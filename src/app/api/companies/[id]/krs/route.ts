import { NextRequest, NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/store";
import { fetchKrsFacts } from "@/lib/krs";
import { computePriority } from "@/lib/priority";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { krsNumber?: string };
  const krsNumber = body.krsNumber?.trim();
  if (!krsNumber) {
    return NextResponse.json({ error: "Podaj numer KRS" }, { status: 400 });
  }

  const db = await readDb();
  const company = db.companies.find((c) => c.id === id);
  if (!company) {
    return NextResponse.json({ error: "Nie znaleziono firmy" }, { status: 404 });
  }

  const facts = await fetchKrsFacts(krsNumber);
  if (!facts) {
    return NextResponse.json(
      { error: "Nie znaleziono takiego numeru KRS (sprawdz format)" },
      { status: 404 }
    );
  }

  const contacts = db.contacts.filter((c) => c.companyId === company.id);
  const signals = db.signals.filter((s) => s.companyId === company.id);

  const updated = {
    ...company,
    krsNumber,
    krsLegalForm: facts.legalForm,
    krsRegisteredAt: facts.registeredAt,
    krsLegalFlag: facts.legalFlag,
    krsCheckedAt: new Date().toISOString(),
  };
  const { level, reason } = computePriority(updated, contacts, signals, db.icp);
  updated.priority = level;
  updated.priorityReason = reason;

  await updateDb((d) => {
    const target = d.companies.find((c) => c.id === company.id);
    if (target) Object.assign(target, updated);
  });

  return NextResponse.json(updated);
}
