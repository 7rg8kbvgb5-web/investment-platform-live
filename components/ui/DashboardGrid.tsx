import { ReactNode } from "react";

type DashboardGridProps = {
  children: ReactNode;
};

export default function DashboardGrid({ children }: DashboardGridProps) {
  return <section className="ui-dashboard-grid">{children}</section>;
}