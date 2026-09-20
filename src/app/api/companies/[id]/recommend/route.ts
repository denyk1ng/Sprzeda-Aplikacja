import { NextRequest, NextResponse } from "next/server";
import { newId, readDb, updateDb } from "@/lib/store";
import { generateRecommendation } from "@/lib/claude";
import type { Recommendation } from "@/lib/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await readDb();
  const company = db.companies.find((c) => c.id === id);
  if (!company) {
    return NextResponse.json({ error: "Nie znaleziono firmy" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as { signalId?: string };

  const contacts = db.contacts.filter((c) => c.companyId === company.id);
  const primaryContact = contacts.find((c) => c.isPrimary) ?? contacts[0];

  const companySignals = db.signals
    .filter((s) => s.companyId === company.id)
    .sort((a, b) => (a.detectedAt < b.detectedAt ? 1 : -1));
  const signal = body.signalId
    ? companySignals.find((s) => s.id === body.signalId)
    : companySignals[0];

  const draft = await generateRecommendation(db.icp, company, primaryContact, signal);

  const recommendation: Recommendation = {
    id: newId("rec"),
    companyId: company.id,
    contactId: primaryContact?.id,
    signalId: signal?.id,
    angle: draft.angle,
    message: draft.message,
    createdAt: new Date().toISOString(),
    generatedBy: draft.generatedBy,
  };

  await updateDb((d) => {
    d.recommendations.push(recommendation);
  });

  return NextResponse.json(recommendation, { status: 201 });
}
