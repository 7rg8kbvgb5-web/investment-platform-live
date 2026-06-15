import type { DriftResult } from "./portfolio-drift-monitoring";

export type DriftAlert = {
  code: string;
  name: string;
  severity: "low" | "medium" | "high";
  message: string;
};

export function buildDriftAlerts(
  driftResults: DriftResult[]
): DriftAlert[] {
  return driftResults
    .filter((position) => position.status !== "within-range")
    .map((position) => ({
      code: position.code,
      name: position.name,
      severity:
        position.status === "action-required"
          ? "high"
          : "medium",
      message:
        position.status === "action-required"
          ? `${position.name} has drifted ${position.driftPercentage}% from target and requires portfolio action.`
          : `${position.name} has drifted ${position.driftPercentage}% from target and should be monitored.`,
    }));
}