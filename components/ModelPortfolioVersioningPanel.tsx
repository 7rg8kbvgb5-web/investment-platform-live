import {
    compareModelPortfolioVersions,
    getLatestModelPortfolioVersion,
    getModelPortfolioVersions
  } from "../lib/engines/model-portfolio-versioning"
  
  export function ModelPortfolioVersioningPanel() {
    const versions = getModelPortfolioVersions()
    const latestVersion = getLatestModelPortfolioVersion()
    const changes = compareModelPortfolioVersions()
  
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Model Portfolio Governance
          </p>
          <h2 className="text-xl font-semibold text-slate-900">
            Model Portfolio Versioning
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Tracks approved model versions, committee approval history and changes
            between portfolio versions.
          </p>
        </div>
  
        <div className="mb-6 rounded-xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Latest approved version</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {latestVersion.portfolioName} v{latestVersion.version}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Approved {latestVersion.approvalDate} by {latestVersion.approvedBy}
          </p>
          <p className="mt-2 text-sm text-slate-700">
            {latestVersion.changeSummary}
          </p>
        </div>
  
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">
              Version History
            </h3>
            <div className="space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <p className="font-medium text-slate-900">
                    {version.portfolioName} v{version.version}
                  </p>
                  <p className="text-sm text-slate-600">
                    Approved {version.approvalDate}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {version.changeSummary}
                  </p>
                </div>
              ))}
            </div>
          </div>
  
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">
              Version Change Log
            </h3>
            <div className="space-y-3">
              {changes.map((change) => (
                <div
                  key={change.field}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <p className="font-medium text-slate-900">{change.field}</p>
                  <p className="text-sm text-slate-600">
                    {change.previousValue} → {change.newValue}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {change.rationale}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }