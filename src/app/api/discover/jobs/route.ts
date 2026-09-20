import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/store";
import { findHiringLeads } from "@/lib/job-signals";

// The upstream feed is a large public JSON dump with no server-side
// filtering, so a cold fetch+scan can take a while - give it real room to
// finish instead of racing the platform's default function timeout.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    keyword?: string;
    cities?: string[];
  };

  const db = await readDb();
  const cities = body.cities ?? db.icp.cities;

  const leads = await findHiringLeads(body.keyword, cities);
  if (leads === null) {
    return NextResponse.json(
      {
        error:
          "Zrodlo ofert pracy jest chwilowo niedostepne (nofluffjobs.com) - sprobuj ponownie za chwile.",
      },
      { status: 502 }
    );
  }

  const existingDomains = new Set(db.companies.map((c) => c.domain));
  const existingNames = new Set(db.companies.map((c) => c.name.toLowerCase()));
  const filtered = leads
    .filter((l) => !existingNames.has(l.company.toLowerCase()))
    .filter((l) => !existingDomains.has(l.company.toLowerCase()));

  return NextResponse.json({ leads: filtered });
}
