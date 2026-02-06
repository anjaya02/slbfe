import { Pipe, PipeTransform } from "@angular/core";
import { ComplaintStatus } from "../../core/models/complaint.model";

@Pipe({ name: "statusColor", pure: true })
export class StatusColorPipe implements PipeTransform {
  transform(status: ComplaintStatus | string): string {
    const colorMap: Record<string, string> = {
      [ComplaintStatus.DRAFT]: "#6B7280",
      [ComplaintStatus.SUBMITTED]: "#3B82F6",
      [ComplaintStatus.PENDING_VERIFICATION]: "#F59E0B",
      [ComplaintStatus.UNDER_REVIEW]: "#8B5CF6",
      [ComplaintStatus.INVESTIGATION]: "#F59E0B",
      [ComplaintStatus.ESCALATED]: "#EF4444",
      [ComplaintStatus.AWAITING_INFO]: "#F97316",
      [ComplaintStatus.IN_PROGRESS]: "#3B82F6",
      [ComplaintStatus.RESOLVED]: "#10B981",
      [ComplaintStatus.CLOSED]: "#6B7280",
    };
    return colorMap[status] || "#6B7280";
  }
}
