import type { HealthStatus } from "@/lib/types";

// One rule for project health everywhere in HorizonView: the status badge,
// the colour of the health bar, portfolio counts, the AI summary, SteerCo deck
// and podcast all come from the same 0–100 health score.
//   75 and above → Green · 50 to 74 → Amber · below 50 → Red
export const HEALTH_GREEN_AT = 75;
export const HEALTH_RED_BELOW = 50;

export function statusFromScore(score: number): HealthStatus {
  if (score >= HEALTH_GREEN_AT) return "Green";
  if (score < HEALTH_RED_BELOW) return "Red";
  return "Amber";
}
