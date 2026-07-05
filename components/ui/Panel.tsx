import { ReactNode } from "react";

type PanelProps = {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  actions?: ReactNode;
};

export default function Panel({
  title,
 eyebrow,
  actions,
  children,
}: PanelProps) {
  return (
    <section className="ui-panel">
      {(title || eyebrow || actions) && (
        <div className="ui-panel-header">
          <div>
            {eyebrow && (
              <p className="ui-panel-eyebrow">
                {eyebrow}
              </p>
            )}

            {title && (
              <h2 className="ui-panel-title">
                {title}
              </h2>
            )}
          </div>

          {actions && (
            <div className="ui-panel-actions">
              {actions}
            </div>
          )}
        </div>
      )}

      <div className="ui-panel-body">
        {children}
      </div>
    </section>
  );
}