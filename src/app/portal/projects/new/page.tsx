import { PageHeader, Notice } from "@/components/ui";
import { NewProjectForm, type TemplateOption } from "@/components/new-project-form";
import { hasSupabase, sbSelect } from "@/lib/supabase";
import { getProjects } from "@/lib/data/provider";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  if (!hasSupabase()) {
    return (
      <div className="space-y-6">
        <PageHeader kicker="Portfolio" title="New project" sub="Create a project that your team runs inside HorizonView." />
        <Notice>The project database isn&apos;t connected for this site yet, so new projects can&apos;t be created here.</Notice>
      </div>
    );
  }
  const [rows, projects] = await Promise.all([
    sbSelect("project_templates", "select=id,name,description&order=sort_order.asc"),
    getProjects(),
  ]);
  const templates: TemplateOption[] = rows.map((r) => ({ id: String(r.id), name: String(r.name), description: String(r.description ?? "") }));
  const programs = Array.from(new Set(projects.map((p) => p.portfolio).filter(Boolean))).sort();
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Portfolio"
        title="New project"
        sub="Enter the details once. HorizonView builds the workstreams, milestones and starter plan, and the project rolls up to the portfolio automatically."
      />
      <NewProjectForm templates={templates} programs={programs} />
      <p className="text-[0.72rem] leading-relaxed text-hv-subtle">
        Demo note: anyone who signs in can create projects here. In a client deployment, roles will be added so only
        designated roles (for example a portfolio manager or PMO lead) can create, edit or archive projects, while
        project managers update their own projects and executives have view-only access.
      </p>
    </div>
  );
}
