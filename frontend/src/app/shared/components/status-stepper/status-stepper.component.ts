import { Component, Input } from "@angular/core";
import {
  ComplaintStatus,
  STATUS_STEPS,
} from "../../../core/models/complaint.model";

@Component({
  selector: "app-status-stepper",
  templateUrl: "./status-stepper.component.html",
  styleUrls: ["./status-stepper.component.scss"],
})
export class StatusStepperComponent {
  @Input() currentStatus: ComplaintStatus = ComplaintStatus.SUBMITTED;

  steps = STATUS_STEPS;

  getStepState(step: ComplaintStatus): "completed" | "active" | "pending" {
    const currentIdx = this.steps.indexOf(this.currentStatus);
    const stepIdx = this.steps.indexOf(step);
    if (stepIdx < currentIdx) return "completed";
    if (stepIdx === currentIdx) return "active";
    return "pending";
  }

  getStepLabel(step: ComplaintStatus): string {
    const labels: Record<string, string> = {
      [ComplaintStatus.SUBMITTED]: "Submitted",
      [ComplaintStatus.UNDER_REVIEW]: "Under Review",
      [ComplaintStatus.INVESTIGATION]: "Investigation",
      [ComplaintStatus.ESCALATED]: "Escalate",
      [ComplaintStatus.RESOLVED]: "Resolved",
    };
    return labels[step] || step;
  }
}
