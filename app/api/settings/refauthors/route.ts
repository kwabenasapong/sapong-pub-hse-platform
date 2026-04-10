import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authors = await prisma.referenceAuthor.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(authors);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
    const author = await prisma.referenceAuthor.create({ data: { name: name.trim() } });
    return NextResponse.json(author);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed (name may already exist)" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, name } = await req.json();
    if (!id || !name?.trim()) return NextResponse.json({ error: "id and name required" }, { status: 400 });
    const author = await prisma.referenceAuthor.update({ where: { id }, data: { name: name.trim() } });
    return NextResponse.json(author);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await prisma.referenceAuthor.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
