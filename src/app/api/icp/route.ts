import { NextRequest, NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/store";
import type { IcpProfile } from "@/lib/types";

export async function GET() {
  const db = await readDb();
  return NextResponse.json(db.icp);
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as Partial<IcpProfile>;
  const db = await updateDb((d) => {
    d.icp = {
      companyName: body.companyName ?? d.icp.companyName,
      productDescription: body.productDescription ?? d.icp.productDescription,
      valueProps: body.valueProps ?? d.icp.valueProps,
      targetTitles: body.targetTitles ?? d.icp.targetTitles,
      targetIndustries: body.targetIndustries ?? d.icp.targetIndustries,
    };
  });
  return NextResponse.json(db.icp);
}
