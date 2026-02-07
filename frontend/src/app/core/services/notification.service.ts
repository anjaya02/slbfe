import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, of } from "rxjs";
import { delay, map } from "rxjs/operators";
import { AppNotification } from "../models/notification.model";

const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: "NTF1",
    type: "CASE_UPDATE",
    title: "Case R10001 Updated",
    message: "Status changed to Investigation for complaint R10001.",
    read: false,
    timestamp: new Date(Date.now() - 1800000),
    link: "/complaints/C001",
  },
  {
    id: "NTF2",
    type: "ASSIGNMENT",
    title: "New Case Assigned",
    message: "Case R0023 has been assigned to you by Supervisor.",
    read: false,
    timestamp: new Date(Date.now() - 3600000),
    link: "/complaints/C002",
  },
  {
    id: "NTF3",
    type: "SYSTEM_ALERT",
    title: "System Maintenance",
    message: "Scheduled maintenance on Feb 10, 2026 from 2:00 AM to 4:00 AM.",
    read: true,
    timestamp: new Date(Date.now() - 86400000),
  },
  {
    id: "NTF4",
    type: "MENTION",
    title: "You were mentioned",
    message: "Main Admin mentioned you in a note on case R1000.",
    read: true,
    timestamp: new Date(Date.now() - 172800000),
    link: "/complaints/C003",
  },
  {
    id: "NTF5",
    type: "CASE_UPDATE",
    title: "Case R5200 Resolved",
    message: "Case R5200 has been marked as resolved.",
    read: true,
    timestamp: new Date(Date.now() - 259200000),
    link: "/complaints/C004",
  },
  {
    id: "NTF6",
    type: "ASSIGNMENT",
    title: "Case Reassigned",
    message: "Case R1200 has been reassigned from Officer Fernando to you.",
    read: false,
    timestamp: new Date(Date.now() - 7200000),
    link: "/complaints/C006",
  },
];

@Injectable({ providedIn: "root" })
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<AppNotification[]>(
    MOCK_NOTIFICATIONS,
  );
  public notifications$ = this.notificationsSubject.asObservable();

  get unreadCount$(): Observable<number> {
    return this.notificationsSubject.pipe(
      map((notifications) => notifications.filter((n) => !n.read).length),
    );
  }

  getUnreadCount(): number {
    return this.notificationsSubject.value.filter((n) => !n.read).length;
  }

  getNotifications(): Observable<AppNotification[]> {
    return this.notifications$;
  }

  markAsRead(id: string): Observable<void> {
    const list = this.notificationsSubject.value.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    this.notificationsSubject.next(list);
    return of(void 0).pipe(delay(200));
  }

  markAllAsRead(): Observable<void> {
    const list = this.notificationsSubject.value.map((n) => ({
      ...n,
      read: true,
    }));
    this.notificationsSubject.next(list);
    return of(void 0).pipe(delay(200));
  }

  deleteNotification(id: string): Observable<void> {
    const list = this.notificationsSubject.value.filter((n) => n.id !== id);
    this.notificationsSubject.next(list);
    return of(void 0).pipe(delay(200));
  }

  clearAll(): Observable<void> {
    this.notificationsSubject.next([]);
    return of(void 0).pipe(delay(200));
  }
}
