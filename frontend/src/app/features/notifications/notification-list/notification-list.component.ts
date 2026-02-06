import { Component, OnInit } from "@angular/core";
import { NotificationService } from "../../../core/services/notification.service";
import { AppNotification } from "../../../core/models/notification.model";

@Component({
  selector: "app-notification-list",
  templateUrl: "./notification-list.component.html",
  styleUrls: ["./notification-list.component.scss"],
})
export class NotificationListComponent implements OnInit {
  notifications: AppNotification[] = [];
  filteredNotifications: AppNotification[] = [];
  activeFilter: "all" | "unread" = "all";

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.notificationService.notifications$.subscribe((n) => {
      this.notifications = n;
      this.applyFilter();
    });
  }

  applyFilter(): void {
    if (this.activeFilter === "unread") {
      this.filteredNotifications = this.notifications.filter((n) => !n.read);
    } else {
      this.filteredNotifications = [...this.notifications];
    }
  }

  setFilter(filter: "all" | "unread"): void {
    this.activeFilter = filter;
    this.applyFilter();
  }

  markAsRead(id: string): void {
    this.notificationService.markAsRead(id);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  deleteNotification(id: string): void {
    this.notificationService.deleteNotification(id);
  }

  clearAll(): void {
    this.notificationService.clearAll();
  }

  getIcon(type: string): string {
    const icons: Record<string, string> = {
      STATUS_UPDATE: "update",
      NEW_ASSIGNMENT: "assignment",
      ESCALATION: "priority_high",
      DEADLINE: "schedule",
      SYSTEM: "info",
    };
    return icons[type] || "notifications";
  }

  getIconClass(type: string): string {
    const cls: Record<string, string> = {
      STATUS_UPDATE: "icon-blue",
      NEW_ASSIGNMENT: "icon-green",
      ESCALATION: "icon-red",
      DEADLINE: "icon-orange",
      SYSTEM: "icon-gray",
    };
    return cls[type] || "icon-gray";
  }
}
