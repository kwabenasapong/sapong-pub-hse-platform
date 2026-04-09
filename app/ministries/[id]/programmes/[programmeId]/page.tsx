import { notFound } from "next/navigation";
import { getProgrammeById } from "@/lib/queries";
import ProgrammeDetailClient from "./ProgrammeDetailClient";

export const dynamic = "force-dynamic";

export default async function ProgrammeDetailPage({
  params,
}: {
  params: { id: string; programmeId: string };
}) {
  const programme = await getProgrammeById(params.programmeId);
  if (!programme) notFound();
  return <ProgrammeDetailClient programme={programme} ministryId={params.id} />;
}
