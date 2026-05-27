import type { CSSProperties, ReactNode } from 'react';

export type StatusVariant = 'success' | 'warning' | 'error' | 'neutral';

type StatusBoxProps = {
  variant: StatusVariant;
  children: ReactNode;
  display?: 'box' | 'inline';
};

const boxStyles: Record<StatusVariant, CSSProperties> = {
  success: {
    padding: '18px',
    background: '#0f3d2e',
    border: '1px solid #10b981',
    borderRadius: '12px',
    marginBottom: '25px',
  },
  warning: {
    padding: '18px',
    background: '#5b2b12',
    border: '1px solid #d97706',
    borderRadius: '12px',
    marginBottom: '25px',
  },
  error: {
    padding: '18px',
    background: '#4a1520',
    border: '1px solid #ef4444',
    borderRadius: '12px',
    marginBottom: '25px',
  },
  neutral: {
    padding: '18px',
    background: '#12345b',
    border: '1px solid #2d4a6b',
    borderRadius: '12px',
    marginBottom: '25px',
  },
};

export function allocationStatusVariant(status: string): StatusVariant {
  return status === 'Valid' ? 'success' : 'warning';
}

export default function StatusBox({
  variant,
  children,
  display = 'box',
}: StatusBoxProps) {
  if (display === 'inline') {
    return <strong>{children}</strong>;
  }

  return <div style={boxStyles[variant]}>{children}</div>;
}
