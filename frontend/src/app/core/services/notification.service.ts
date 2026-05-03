import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { BehaviorSubject, Observable } from "rxjs";
import { map, tap } from "rxjs/operators";
import { AppNotification } from "../models/notification.model";
import { environment } from "../../../environments/environment";
import { AuthService } from "./auth.service";

@Injectable({ providedIn: "root" })
export class NotificationService {
  private readonly apiBaseUrl = environment.apiBaseUrl;
  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.loadNotifications().subscribe();
        return;
      }

      this.notificationsSubject.next([]);
    });
  }

  private mapNotification(notification: any): AppNotification {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: Boolean(notification.read),
      timestamp: new Date(notification.timestamp),
      link: notification.link || undefined,
      icon: notification.icon,
    };
  }

  private loadNotifications(filter: "all" | "unread" = "all"): Observable<AppNotification[]> {
    const params = new HttpParams().set("filter", filter);

    return this.http
      .get<any[]>(`${this.apiBaseUrl}/notifications`, { params })
      .pipe(
        map((notifications) =>
          notifications.map((notification) => this.mapNotification(notification)),
        ),
        tap((notifications) => this.notificationsSubject.next(notifications)),
      );
  }

  getUnreadCount(): number {
    return this.notificationsSubject.value.filter((n) => !n.read).length;
  }

  getNotifications(): Observable<AppNotification[]> {
    return this.loadNotifications();
  }

  markAsRead(id: string): Observable<void> {
    return this.http.patch(`${this.apiBaseUrl}/notifications/${id}/read`, {}).pipe(
      tap(() => {
        this.notificationsSubject.next(
          this.notificationsSubject.value.map((notification) =>
            notification.id === id
              ? { ...notification, read: true }
              : notification,
          ),
        );
      }),
      map(() => void 0),
    );
  }

  markAllAsRead(): Observable<void> {
    return this.http.patch(`${this.apiBaseUrl}/notifications/read-all`, {}).pipe(
      tap(() => {
        this.notificationsSubject.next(
          this.notificationsSubject.value.map((notification) => ({
            ...notification,
            read: true,
          })),
        );
      }),
      map(() => void 0),
    );
  }

  deleteNotification(id: string): Observable<void> {
    return this.http.delete(`${this.apiBaseUrl}/notifications/${id}`).pipe(
      tap(() => {
        this.notificationsSubject.next(
          this.notificationsSubject.value.filter(
            (notification) => notification.id !== id,
          ),
        );
      }),
      map(() => void 0),
    );
  }

  clearAll(): Observable<void> {
    return this.http.delete(`${this.apiBaseUrl}/notifications`).pipe(
      tap(() => this.notificationsSubject.next([])),
      map(() => void 0),
    );
  }
}
