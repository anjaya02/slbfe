import { Component, OnInit, OnDestroy } from "@angular/core";
import { Router } from "@angular/router";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { NotificationService } from "../../../core/services/notification.service";
import { ToastService } from "../../../core/services/toast.service";
import { AppNotification } from "../../../core/models/notification.model";

@Component({
  standalone: false,
  selector: "app-notification-list",
  templateUrl: "./notification-list.component.html",
  styleUrls: ["./notification-list.component.scss"],
})
export class NotificationListComponent implements OnInit, OnDestroy {
  notifications: AppNotification[] = [];
  filteredNotifications: AppNotification[] = [];
  activeFilter: "all" | "unread" = "all";
  private destroy$ = new Subject<void>();

  constructor(
    private notificationService: NotificationService,
    private router: Router,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.notificationService
      .notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe((n) => {
        this.notifications = n;
        this.applyFilter();
      });

    this.notificationService
      .getNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  markAsRead(notification: AppNotification): void {
    const wasUnread = !notification.read;
    this.notificationService
      .markAsRead(notification.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (wasUnread) {
          this.toast.success("Notification marked as read");
        }
        if (notification.link) {
          this.router.navigateByUrl(notification.link);
        }
      });
  }

  markAllAsRead(): void {
    this.notificationService
      .markAllAsRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyFilter();
        this.toast.success("All notifications marked as read");
      });
  }

  deleteNotification(id: string): void {
    this.notificationService
      .deleteNotification(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyFilter();
        this.toast.success("Notification deleted");
      });
  }

  clearAll(): void {
    this.notificationService
      .clearAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyFilter();
        this.toast.success("All notifications cleared");
      });
  }

  getIcon(type: string): string {
    const icons: Record<string, string> = {
      CASE_UPDATE: "update",
      ASSIGNMENT: "assignment",
      SYSTEM_ALERT: "info",
      MENTION: "alternate_email",
    };
    return icons[type] || "notifications";
  }

  getIconClass(type: string): string {
    const cls: Record<string, string> = {
      CASE_UPDATE: "icon-blue",
      ASSIGNMENT: "icon-green",
      SYSTEM_ALERT: "icon-gray",
      MENTION: "icon-orange",
    };
    return cls[type] || "icon-gray";
  }
}
