import { NextRequest, NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/store";
import { manualContact } from "@/lib/contact-utils";
import { computePriority } from "@/lib/priority";

/** Lets the user add a contact they found themselves (e.g. on LinkedIn) when neither Apollo nor the website scraper found anyone real. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    firstName?: string;
    lastName?: string;
    title?: string;
    phone?: string;
    email?: string;
    linkedinUrl?: string;
  };

  if (!body.firstName?.trim() || !body.lastName?.trim() || !body.title?.trim()) {
    return NextResponse.json(
      { error: "Podaj przynajmniej imie, nazwisko i stanowisko" },
      { status: 400 }
    );
  }

  const db = await readDb();
  const company = db.companies.find((c) => c.id === id);
  if (!company) {
    return NextResponse.json({ error: "Nie znaleziono firmy" }, { status: 404 });
  }

  const contact = manualContact(company.id, db.icp.targetTitles, {
    firstName: body.firstName.trim(),
    lastName: body.lastName.trim(),
    title: body.title.trim(),
    phone: body.phone?.trim() || undefined,
    email: body.email?.trim() || undefined,
    linkedinUrl: body.linkedinUrl?.trim() || undefined,
  });

  const otherContacts = db.contacts.filter((c) => c.companyId === company.id);
  const allContacts = [...otherContacts, contact];
  // Manually-confirmed real people should outrank a title-match guess, so a
  // freshly added contact always becomes primary regardless of score.
  allContacts.forEach((c) => (c.isPrimary = c.id === contact.id));

  const signals = db.signals.filter((s) => s.companyId === company.id);
  const { level, reason } = computePriority(company, allContacts, signals, db.icp);

  await updateDb((d) => {
    d.contacts.push(contact);
    const target = d.companies.find((c) => c.id === company.id);
    if (target) {
      target.priority = level;
      target.priorityReason = reason;
    }
  });

  return NextResponse.json(contact, { status: 201 });
}
