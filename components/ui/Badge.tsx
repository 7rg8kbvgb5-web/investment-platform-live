import { ReactNode } from "react";

export type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "primary";

type BadgeProps = {
  variant: BadgeVariant;
  children: ReactNode;
};

export default function Badge({ variant, children }: BadgeProps) {
  return <span className={`ui-badge ui-badge-${variant}`}>{children}</span>;
}
