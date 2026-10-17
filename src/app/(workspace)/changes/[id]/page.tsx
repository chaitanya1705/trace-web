import { ChangeView } from "@/features/changes/ChangeView";

export const metadata = { title: "Change · TRACE" };

export default async function FixPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChangeView id={id} />;
}
