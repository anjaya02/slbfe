import { Injectable } from "@angular/core";
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
  HttpHeaders,
} from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { catchError, switchMap } from "rxjs/operators";
import { ToastService } from "../services/toast.service";
import { AuthService } from "../services/auth.service";

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  private readonly authRetryHeader = "X-Auth-Retry";

  constructor(
    private toast: ToastService,
    private auth: AuthService,
  ) {}

  private withUpdatedAccessToken(req: HttpRequest<any>): HttpRequest<any> {
    const token = this.auth.token;

    return req.clone({
      headers: this.withRetryHeader(req.headers),
      setHeaders: token
        ? { Authorization: `Bearer ${token}` }
        : undefined,
    });
  }

  private withRetryHeader(headers: HttpHeaders): HttpHeaders {
    return headers.set(this.authRetryHeader, "1");
  }

  private shouldTryRefresh(req: HttpRequest<any>): boolean {
    return (
      !req.url.includes("/auth/login") &&
      !req.url.includes("/auth/refresh") &&
      !req.url.includes("/auth/logout") &&
      !req.headers.has(this.authRetryHeader)
    );
  }

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (req.url.includes("/auth/login")) {
          return throwError(() => error);
        }

        let message = error.error?.message || "An unexpected error occurred";
        if (error.status === 401) {
          if (this.shouldTryRefresh(req)) {
            return this.auth.refreshSession().pipe(
              switchMap(() => next.handle(this.withUpdatedAccessToken(req))),
              catchError((refreshError: HttpErrorResponse) => {
                this.auth.handleExpiredSession();
                const refreshMessage =
                  refreshError.error?.message ||
                  "Session expired. Please login again.";
                this.toast.error(refreshMessage);
                return throwError(() => refreshError);
              }),
            );
          } else {
            message = "Session expired. Please login again.";
            this.auth.handleExpiredSession();
          }
        } else if (error.status === 403) {
          message =
            error.error?.message ||
            "You do not have permission to perform this action.";
        } else if (error.status === 404) {
          message = error.error?.message || "Resource not found.";
        } else if (error.status >= 500) {
          message = "Server error. Please try again later.";
        }
        this.toast.error(message);
        return throwError(() => error);
      }),
    );
  }
}
