import { Injectable } from "@angular/core";
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { MatSnackBar } from "@angular/material/snack-bar";
import { AuthService } from "../services/auth.service";

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private snackBar: MatSnackBar,
    private auth: AuthService,
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        let message = "An unexpected error occurred";
        if (error.status === 401) {
          message = "Session expired. Please login again.";
          this.auth.logout();
        } else if (error.status === 403) {
          message = "You do not have permission to perform this action.";
        } else if (error.status === 404) {
          message = "Resource not found.";
        } else if (error.status >= 500) {
          message = "Server error. Please try again later.";
        }
        this.snackBar.open(message, "Close", {
          duration: 5000,
          panelClass: ["error-snackbar"],
        });
        return throwError(() => error);
      }),
    );
  }
}
