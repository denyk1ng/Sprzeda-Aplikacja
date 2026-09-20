import { NextRequest, NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/store";
import type { Stage } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await readDb();
  const company = db.companies.find((c) => c.id === id);
  if (!company) {
    return NextResponse.json({ error: "Nie znaleziono firmy" }, { status: 404 });
  }
  const contacts = db.contacts.filter((c) => c.companyId === company.id);
  const signals = db.signals
    .filter((s) => s.companyId === company.id)
    .sort((a, b) => (a.detectedAt < b.detectedAt ? 1 : -1));
  const recommendations = db.recommendations
    .filter((r) => r.companyId === company.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return NextResponse.json({ company, contacts, signals, recommendations });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    stage?: Stage;
    nextStepAt?: string | null;
    nextStepNote?: string | null;
    industry?: string | null;
    employeeCount?: number | null;
    city?: string | null;
    phone?: string | null;
  };

  const db = await updateDb((d) => {
    const company = d.companies.find((c) => c.id === id);
    if (!company) return;
    if (body.stage !== undefined) company.stage = body.stage;
    if (body.nextStepAt !== undefined) {
      company.nextStepAt = body.nextStepAt ?? undefined;
    }
    if (body.nextStepNote !== undefined) {
      company.nextStepNote = body.nextStepNote ?? undefined;
    }
    // Manual correction - the user verified this themselves, so it overrides
    // whatever (if anything) Apollo returned.
    if (body.industry !== undefined) company.industry = body.industry ?? undefined;
    if (body.employeeCount !== undefined) {
      company.employeeCount = body.employeeCount ?? undefined;
    }
    if (body.city !== undefined) company.city = body.city ?? undefined;
    if (body.phone !== undefined) company.phone = body.phone ?? undefined;
  });

  const company = db.companies.find((c) => c.id === id);
  if (!company) {
    return NextResponse.json({ error: "Nie znaleziono firmy" }, { status: 404 });
  }
  return NextResponse.json(company);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await updateDb((d) => {
    d.companies = d.companies.filter((c) => c.id !== id);
    d.contacts = d.contacts.filter((c) => c.companyId !== id);
    d.signals = d.signals.filter((s) => s.companyId !== id);
    d.recommendations = d.recommendations.filter((r) => r.companyId !== id);
  });
  return NextResponse.json({ ok: true });
}
