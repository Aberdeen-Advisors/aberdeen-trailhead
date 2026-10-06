import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProject, getMilestones, getRaid } from "@/lib/data/provider";
import { projectDashboard } from "@/lib/stacks";
import { ShowcaseDashboard, styleFor } from "@/components/showcase-dashboards";

export const dynamic = "force-dynamic";

// Built-in HorizonView dashboard for a sample project. Projects on Power BI or
// with their own live HTML dashboard are sent there instead.
export default async function ProjectDashboardPage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id);
  if (!project) notFound();
  const target = projectDashboard(project);
  if (target.kind !== "internal") redirect(target.href);

  const [milestones, raid] = await Promise.all([getMilestones(project.id), getRaid(project.id)]);
  const style = styleFor(project.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/portal/reports" className="text-[0.8rem] font-semibold text-navy hover:text-teal-ink">
          ← Dashboards &amp; Reports
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-[0.72rem]">
          <span className="rounded-full border border-hv-border bg-white px-3 py-1 text-hv-muted">
            Style: <span className="font-semibold text-navy">{style.name}</span> · {style.blurb}
          </span>
          <Link href={`/portal/projects/${encodeURIComponent(project.id)}`} className="rounded-full border border-hv-border bg-white px-3 py-1 font-semibold text-navy hover:border-teal">
            Project page
          </Link>
        </div>
      </div>
      <ShowcaseDashboard data={{ project, milestones, raid }} />
      <p className="text-[0.7rem] text-hv-subtle">
        Same project data in every style: project record, milestones and RAID log. Each sample project is shown in a different look to illustrate how HorizonView dashboards can match a client&apos;s brand.
      </p>
    </div>
  );
}
