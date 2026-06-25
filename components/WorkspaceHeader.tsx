type WorkspaceMetric = {
    label: string;
    value: string | number;
    detail?: string;
  };
  
  type WorkspaceStep = {
    label: string;
    status: "complete" | "current" | "upcoming";
  };
  
  type WorkspaceAction = {
    label: string;
    variant?: "primary" | "secondary";
  };
  
  type WorkspaceHeaderProps = {
    title: string;
    description: string;
    metrics: WorkspaceMetric[];
    steps: WorkspaceStep[];
    actions?: WorkspaceAction[];
  };
  
  export default function WorkspaceHeader({
    title,
    description,
    metrics,
    steps,
    actions = [],
  }: WorkspaceHeaderProps) {
    const completedSteps = steps.filter((step) => step.status === "complete").length;
    const progress = Math.round((completedSteps / steps.length) * 100);
  
    return (
      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Workspace
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{description}</p>
          </div>
  
          {actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {actions.map((action) => (
                <button
                  key={action.label}
                  className={
                    action.variant === "primary"
                      ? "rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                      : "rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  }
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
  
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">Workflow progress</span>
            <span className="font-semibold text-slate-950">{progress}%</span>
          </div>
  
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-950"
              style={{ width: `${progress}%` }}
            />
          </div>
  
          <div className="mt-4 grid gap-2 md:grid-cols-3 lg:grid-cols-7">
            {steps.map((step) => (
              <div
                key={step.label}
                className={
                  step.status === "complete"
                    ? "rounded-xl border border-emerald-200 bg-emerald-50 p-3"
                    : step.status === "current"
                      ? "rounded-xl border border-blue-200 bg-blue-50 p-3"
                      : "rounded-xl border border-slate-200 bg-slate-50 p-3"
                }
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {step.status}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {step.label}
                </p>
              </div>
            ))}
          </div>
        </div>
  
        <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-sm font-medium text-slate-500">{metric.label}</p>
              <p className="mt-1 text-xl font-bold text-slate-950">
                {metric.value}
              </p>
              {metric.detail && (
                <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }