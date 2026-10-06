import { getPortfolioSummary } from "@/lib/ai/portfolio-summary";
import type { Project, RaidItem, PortfolioKpis } from "@/lib/types";
import { LocalTime } from "@/components/local-time";

// Executive Summary text for the portfolio hero. Rendered inside <Suspense> so
// the rest of the page shows at once while the AI writes (only when data changed).
export async function PortfolioSummaryText({ projects, raid, kpis }: { projects: Project[]; raid: RaidItem[]; kpis: PortfolioKpis }) {
  const s = await getPortfolioSummary({ projects, raid, kpis });
  const demoCount = s.projectCount - s.liveProjects.length;
  return (
    <>
      <p className="text-[0.98rem] font-light leading-relaxed text-white/90">{s.text}</p>
      <p className="mt-5 border-t border-white/15 pt-4 text-[0.72rem] font-light leading-relaxed text-white/50">
        {s.source === "ai" ? (
          <>
            Written by AI from live data across all {s.projectCount} projects · rewritten whenever the data changes · last
            written <LocalTime iso={s.generatedAt} />
          </>
        ) : (
          <>Built from live data across all {s.projectCount} projects · AI summary unavailable right now</>
        )}
        {s.source === "ai" && s.liveProjects.length > 0 && demoCount > 0 && (
          <>
            <br />
            Live: {s.liveProjects.join(", ")}. The other {demoCount} projects are demo data for illustration.
          </>
        )}
      </p>
    </>
  );
}

export function PortfolioSummarySkeleton() {
  return (
    <div aria-busy="true" aria-label="Writing this week's summary">
      <div className="space-y-2.5">
        {[100, 96, 98, 90, 60].map((w, i) => (
          <div key={i} className="h-3.5 animate-pulse rounded bg-white/15" style={{ width: `${w}%` }} />
        ))}
      </div>
      <p className="mt-5 border-t border-white/15 pt-4 text-[0.72rem] font-light text-white/50">
        AI is reading the latest data across every project…
      </p>
    </div>
  );
}
