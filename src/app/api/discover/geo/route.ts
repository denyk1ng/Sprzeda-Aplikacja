import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/store";
import { findCompaniesInCity } from "@/lib/geo-discovery";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    city?: string;
    keyword?: string;
  };
  const city = body.city?.trim();
  if (!city) {
    return NextResponse.json({ error: "Podaj miasto, np. Lublin" }, { status: 400 });
  }

  const leads = await findCompaniesInCity(city, body.keyword);
  if (leads === null) {
    return NextResponse.json(
      {
        error:
          "Zrodlo danych geograficznych (OpenStreetMap) jest chwilowo niedostepne - sprobuj ponownie za chwile.",
      },
      { status: 502 }
    );
  }

  const db = await readDb();
  const existingDomains = new Set(db.companies.map((c) => c.domain));
  const existingNames = new Set(db.companies.map((c) => c.name.toLowerCase()));
  const filtered = leads.filter(
    (l) =>
      !existingNames.has(l.name.toLowerCase()) &&
      !(l.website && existingDomains.has(l.website))
  );

  return NextResponse.json({ leads: filtered });
}
