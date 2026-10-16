import { ProjectsRoute } from "@/features/projects/Projects";

export const metadata = { title: "Projects · TRACE" };

export default async function ProjectsPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  return <ProjectsRoute slug={slug.map(decodeURIComponent)} />;
}
