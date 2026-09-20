import { NextRequest, NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/store";
import { researchCompany } from "@/lib/research";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await readDb();
  const company = db.companies.find((c) => c.id === id);
  if (!company) {
    return NextResponse.json({ error: "Nie znaleziono firmy" }, { status: 404 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Badanie w sieci wymaga klucza ANTHROPIC_API_KEY - dodaj go w .env.local / zmiennych srodowiskowych.",
      },
      { status: 400 }
    );
  }

  const result = await researchCompany(company, db.icp);
  if (!result) {
    return NextResponse.json(
      { error: "Nie udalo sie zbadac firmy w sieci (sprobuj ponownie za chwile)" },
      { status: 502 }
    );
  }

  await updateDb((d) => {
    const target = d.companies.find((c) => c.id === id);
    if (target) {
      target.webResearch = result.report;
      target.webResearchAt = result.generatedAt;
    }
  });

  return NextResponse.json(result);
}
