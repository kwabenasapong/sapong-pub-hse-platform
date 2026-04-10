import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const programme = await prisma.publishingProgramme.update({
      where: { id: params.id },
      data: { masterInstructions: body.masterInstructions },
    });
    return NextResponse.json({ ok: true, id: programme.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
