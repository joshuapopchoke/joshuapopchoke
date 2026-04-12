import type { TrainingModuleDefinition } from "../data/trainingModules";

interface ModuleCompletionOverlayProps {
  module: TrainingModuleDefinition;
  moduleScore: number;
  targetScore: number;
  onDismiss: () => void;
}

export function ModuleCompletionOverlay({
  module,
  moduleScore,
  targetScore,
  onDismiss
}: ModuleCompletionOverlayProps) {
  return (
    <div className="overlay">
      <div className="overlay-card module-complete-card">
        <div className="overlay-header">
          <div className="overlay-copy">
            <p className="eyebrow">Module Complete</p>
            <h2>{module.title}</h2>
            <p>{module.description}</p>
          </div>
          <div className="overlay-actions">
            <button type="button" className="control-btn active" onClick={onDismiss}>
              Continue
            </button>
          </div>
        </div>
        <div className="study-summary-grid">
          <div className="study-summary-card">
            <span>Module Score</span>
            <strong>{moduleScore}/100</strong>
            <small>{module.focus}</small>
          </div>
          <div className="study-summary-card">
            <span>Target</span>
            <strong>{targetScore}/100</strong>
            <small>{module.completionLabel}</small>
          </div>
          <div className="study-summary-card">
            <span>Coaching Signals</span>
            <strong>{module.coachingSignals[0] ?? "Progress"}</strong>
            <small>{module.coachingSignals.slice(1).join(" | ")}</small>
          </div>
        </div>
      </div>
    </div>
  );
}
