import type { OrderTaskStage } from "@prisma/client";

const STAGE_LABELS: Record<OrderTaskStage, string> = {
  LABELLING: "Labelling",
  PACKING: "Packing",
  DISPATCH: "Dispatched",
};

export function OrderStepIndicator({ steps }: { steps: Array<{ stage: OrderTaskStage; done: boolean }> }) {
  return (
    <div>
      <div className="sd-step-indicator">
        {steps.map((step) => (
          <div key={step.stage} className={`sd-step${step.done ? " done" : ""}`} />
        ))}
      </div>
      <div className="sd-step-labels">
        {steps.map((step) => (
          <span key={step.stage}>{STAGE_LABELS[step.stage]}</span>
        ))}
      </div>
    </div>
  );
}
