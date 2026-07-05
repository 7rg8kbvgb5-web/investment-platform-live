import { ReactNode } from "react";

type MetricCardProps = {
  label: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
};

export default function MetricCard({
  label,
  value,
  subtitle,
  icon,
}: MetricCardProps) {
  return (
    <div className="ui-metric-card">
      <div className="ui-metric-top">
        <span className="ui-metric-label">{label}</span>
        {icon && <div>{icon}</div>}
      </div>

      <h2 className="ui-metric-value">{value}</h2>

      {subtitle && (
        <p className="ui-metric-subtitle">
          {subtitle}
        </p>
      )}
    </div>
  );
}