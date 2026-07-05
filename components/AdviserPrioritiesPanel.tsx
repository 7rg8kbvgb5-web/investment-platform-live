import Panel from "./ui/Panel";
import {
  adviserPriorities,
  type AdviserPriorityLevel,
} from "../lib/engines/adviser-priorities";

function levelClass(level: AdviserPriorityLevel) {
  return `priority-${level}`;
}

function levelIcon(level: AdviserPriorityLevel) {
  switch (level) {
    case "critical":
      return "🔴";
    case "high":
      return "🟠";
    case "medium":
      return "🟡";
    default:
      return "🔵";
  }
}

export default function AdviserPrioritiesPanel() {
  return (
    <Panel
      eyebrow="Operational Intelligence"
      title="Today's Priorities"
    >
      <div className="priority-list">
        {adviserPriorities.map((item) => (
          <div key={item.id} className={`priority-item ${levelClass(item.level)}`}>
            <div className="priority-icon">
              {levelIcon(item.level)}
            </div>

            <div className="priority-content">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}