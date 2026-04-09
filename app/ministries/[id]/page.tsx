import { notFound } from "next/navigation";
import { getMinistryById } from "@/lib/queries";
import MinistryDetailClient from "./MinistryDetailClient";

export const dynamic = "force-dynamic";

export default async function MinistryDetailPage({ params }: { params: { id: string } }) {
  const ministry = await getMinistryById(params.id);
  if (!ministry) notFound();
  return <MinistryDetailClient ministry={ministry} />;
}
