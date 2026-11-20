import { notFound } from "next/navigation";
import data from "@/data/portfolio.json";
import { ProjectPage } from "@/components/portfolio/InnerPages";
export const dynamicParams = false;
export function generateStaticParams() {
  return data.projects.map((project) => ({ slug: project.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = data.projects.find((project) => project.slug === slug);
  return { title: project?.title, description: project?.summary };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = data.projects.find((project) => project.slug === slug);
  if (!project) notFound();
  return <ProjectPage project={project} />;
}
