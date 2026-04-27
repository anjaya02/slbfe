import { Component, Input } from "@angular/core";
import { ComplaintStatus } from "../../../core/models/complaint.model";

@Component({
  standalone: false,
  selector: "app-status-stepper",
  templateUrl: "./status-stepper.component.html",
  styleUrls: ["./status-stepper.component.scss"],
})
export class StatusStepperComponent {
  @Input() currentStatus: ComplaintStatus = ComplaintStatus.SUBMITTED;

  steps: ComplaintStatus[] = [
    ComplaintStatus.SUBMITTED,
    ComplaintStatus.UNDER_REVIEW,
    ComplaintStatus.IN_PROGRESS,
    ComplaintStatus.AWAITING_INFO,
    ComplaintStatus.RESOLVED,
    ComplaintStatus.CLOSED,
  ];

  private getEffectiveIndex(status: ComplaintStatus): number {
    return this.steps.indexOf(status);
  }

  getStepState(step: ComplaintStatus): "completed" | "active" | "pending" {
    const currentIdx = this.getEffectiveIndex(this.currentStatus);
    const stepIdx = this.steps.indexOf(step);
    if (stepIdx < currentIdx) return "completed";
    if (stepIdx === currentIdx) return "active";
    return "pending";
  }

  getStepLabel(step: ComplaintStatus): string {
    const labels: Record<string, string> = {
      [ComplaintStatus.SUBMITTED]: "Submitted",
      [ComplaintStatus.UNDER_REVIEW]: "Under Review",
      [ComplaintStatus.IN_PROGRESS]: "In Progress",
      [ComplaintStatus.AWAITING_INFO]: "Awaiting Info",
      [ComplaintStatus.RESOLVED]: "Resolved",
      [ComplaintStatus.CLOSED]: "Closed",
    };
    return labels[step] || step;
  }
}
