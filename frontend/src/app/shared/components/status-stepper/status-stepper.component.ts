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

  /**
   * Maps any complaint status to an effective index within STATUS_STEPS.
   * Statuses not directly in steps are mapped to their logical position:
   *   DRAFT / PENDING_VERIFICATION → before SUBMITTED (index -1)
   *   IN_PROGRESS / AWAITING_INFO → same level as INVESTIGATION
   *   CLOSED → after RESOLVED (past the end)
   */
  private getEffectiveIndex(status: ComplaintStatus): number {
    const directIdx = this.steps.indexOf(status);
    if (directIdx !== -1) return directIdx;

    const positionMap: Partial<Record<ComplaintStatus, number>> = {
      [ComplaintStatus.DRAFT]: -1,
      [ComplaintStatus.PENDING_VERIFICATION]: -1,
      [ComplaintStatus.IN_PROGRESS]: this.steps.indexOf(
        ComplaintStatus.INVESTIGATION,
      ),
      [ComplaintStatus.AWAITING_INFO]: this.steps.indexOf(
        ComplaintStatus.INVESTIGATION,
      ),
      [ComplaintStatus.CLOSED]: this.steps.length,
    };
    return positionMap[status] ?? -1;
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
      [ComplaintStatus.INVESTIGATION]: "Investigation",
      [ComplaintStatus.ESCALATED]: "Escalate",
      [ComplaintStatus.RESOLVED]: "Resolved",
    };
    return labels[step] || step;
  }
}
