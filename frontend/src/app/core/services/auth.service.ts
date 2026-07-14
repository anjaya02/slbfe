import { Injectable } from "@angular/core";
import { HttpBackend, HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { BehaviorSubject, Observable, of, throwError } from "rxjs";
import {
  catchError,
  finalize,
  map,
  shareReplay,
  switchMap,
  tap,
} from "rxjs/operators";
import {
  User,
  UserRole,
  LoginRequest,
  LoginResponse,
  CreateUserRequest,
  ChangePasswordRequest,
  UserSettings,
} from "../models/user.model";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private readonly authHttp: HttpClient;
  private refreshRequest$: Observable<LoginResponse> | null = null;

  private readonly tokenKey = environment.tokenKey;
  private readonly refreshTokenKey = environment.refreshTokenKey;
  private readonly userKey = "slbfe_auth_user";
  private readonly apiBaseUrl = environment.apiBaseUrl;

  constructor(
    private http: HttpClient,
    private httpBackend: HttpBackend,
    private router: Router,
  ) {
    this.authHttp = new HttpClient(httpBackend);
    this.loadUserFromStorage();
  }

  private clearStorage(storage: Storage): void {
    storage.removeItem(this.tokenKey);
    storage.removeItem(this.refreshTokenKey);
    storage.removeItem(this.userKey);
  }

  private getStoredSession(): {
    storage: Storage;
    token: string;
    refreshToken: string;
    storedUser: string;
  } | null {
    for (const storage of [localStorage, sessionStorage]) {
      const token = storage.getItem(this.tokenKey);
      const refreshToken = storage.getItem(this.refreshTokenKey);
      const storedUser = storage.getItem(this.userKey);

      if (token && refreshToken && storedUser) {
        return { storage, token, refreshToken, storedUser };
      }

      if (token || refreshToken || storedUser) {
        this.clearStorage(storage);
      }
    }

    return null;
  }

  private loadUserFromStorage(): void {
    const session = this.getStoredSession();

    if (!session) {
      this.clearSession();
      return;
    }

    try {
      this.currentUserSubject.next(
        this.mapUser(JSON.parse(session.storedUser)),
      );
    } catch {
      this.clearSession();
    }
  }

  private storeSession(response: LoginResponse, rememberMe: boolean): void {
    const storage = rememberMe ? localStorage : sessionStorage;
    const otherStorage = rememberMe ? sessionStorage : localStorage;

    this.clearStorage(otherStorage);
    storage.setItem(this.tokenKey, response.token);
    storage.setItem(this.refreshTokenKey, response.refreshToken);
    storage.setItem(this.userKey, JSON.stringify(response.user));
    this.currentUserSubject.next(response.user);
  }

  private clearSession(): void {
    this.clearStorage(localStorage);
    this.clearStorage(sessionStorage);
    this.currentUserSubject.next(null);
  }

  private mapUser(user: Partial<User> | null | undefined): User {
    return {
      id: user?.id || "",
      name: user?.name || "",
      email: user?.email || "",
      role: (user?.role as UserRole) || "CASE_OFFICER",
      avatar: user?.avatar || "",
      phone: user?.phone || "",
      location: user?.location || "",
      workCountry: user?.workCountry || "",
      notificationsEnabled: Boolean(user?.notificationsEnabled),
      dateFormat: user?.dateFormat || "DD/MM/YYYY",
      isActive: Boolean(user?.isActive),
      dateCreated: user?.dateCreated ? new Date(user.dateCreated) : undefined,
    };
  }

  private persistCurrentUser(user: User): void {
    const session = this.getStoredSession();

    if (!session) {
      return;
    }

    this.storeSession(
      { token: session.token, refreshToken: session.refreshToken, user },
      session.storage === localStorage,
    );
  }

  login(req: LoginRequest, rememberMe = false): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiBaseUrl}/auth/login`, req)
      .pipe(
        map((response) => ({
          ...response,
          user: this.mapUser(response.user),
        })),
        tap((response) => this.storeSession(response, rememberMe)),
        catchError((error) => {
          const message =
            error?.status === 0
              ? "Unable to reach the server. Please try again."
              : error?.error?.message || "Invalid email or password";
          return throwError(() => new Error(message));
        }),
      );
  }

  refreshSession(): Observable<LoginResponse> {
    const session = this.getStoredSession();

    if (!session?.refreshToken) {
      return throwError(() => new Error("No refresh token available"));
    }

    if (this.refreshRequest$) {
      return this.refreshRequest$;
    }

    this.refreshRequest$ = this.authHttp
      .post<LoginResponse>(`${this.apiBaseUrl}/auth/refresh`, {
        refreshToken: session.refreshToken,
      })
      .pipe(
        map((response) => ({
          ...response,
          user: this.mapUser(response.user),
        })),
        tap((response) =>
          this.storeSession(response, session.storage === localStorage),
        ),
        finalize(() => {
          this.refreshRequest$ = null;
        }),
        shareReplay(1),
      );

    return this.refreshRequest$;
  }

  initializeSession(): Observable<User | null> {
    const session = this.getStoredSession();

    if (!session) {
      return of(null);
    }

    if (!this.token) {
      return this.refreshSession().pipe(
        map((response) => response.user),
        catchError(() => {
          this.clearSession();
          return of(null);
        }),
      );
    }

    return this.getCurrentUserProfile().pipe(
      catchError(() =>
        this.refreshSession().pipe(
          map((response) => response.user),
          catchError(() => {
            this.clearSession();
            return of(null);
          }),
        ),
      ),
    );
  }

  getCurrentUserProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiBaseUrl}/auth/me`).pipe(
      map((user) => this.mapUser(user)),
      tap((user) => this.persistCurrentUser(user)),
    );
  }

  logout(): void {
    const refreshToken = this.getStoredSession()?.refreshToken;

    if (refreshToken) {
      this.authHttp
        .post(`${this.apiBaseUrl}/auth/logout`, { refreshToken })
        .subscribe({ error: () => undefined });
    }

    this.clearSession();
    this.router.navigate(["/login"]);
  }

  handleExpiredSession(): void {
    this.clearSession();
    this.router.navigate(["/login"]);
  }

  get isLoggedIn(): boolean {
    return !!this.currentUserSubject.value && !!this.token;
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get token(): string | null {
    return this.getStoredSession()?.token || null;
  }

  updateProfile(updates: Partial<User>): Observable<User> {
    return this.http
      .patch<User>(`${this.apiBaseUrl}/auth/me/profile`, updates)
      .pipe(
        map((user) => this.mapUser(user)),
        tap((user) => this.persistCurrentUser(user)),
      );
  }

  updatePreferences(updates: Partial<UserSettings>): Observable<UserSettings> {
    return this.http
      .patch<UserSettings>(`${this.apiBaseUrl}/auth/me/preferences`, updates)
      .pipe(
        tap((preferences) => {
          if (!this.currentUser) {
            return;
          }

          this.persistCurrentUser({
            ...this.currentUser,
            notificationsEnabled:
              preferences.notificationsEnabled ??
              this.currentUser.notificationsEnabled,
            dateFormat: preferences.dateFormat ?? this.currentUser.dateFormat,
          });
        }),
      );
  }

  updatePassword(
    request: ChangePasswordRequest,
  ): Observable<{ success: boolean }> {
    // This endpoint only changes the logged-in user's own password.
    return this.http.patch<{ success: boolean }>(
      `${this.apiBaseUrl}/auth/me/password`,
      request,
    );
  }

  getUsers(): Observable<User[]> {
    return this.http
      .get<User[]>(`${this.apiBaseUrl}/users`)
      .pipe(map((users) => users.map((user) => this.mapUser(user))));
  }

  getCaseOfficers(): Observable<User[]> {
    return this.http
      .get<User[]>(`${this.apiBaseUrl}/users/case-officers`)
      .pipe(map((users) => users.map((user) => this.mapUser(user))));
  }

  createUser(userData: CreateUserRequest): Observable<User> {
    return this.http
      .post<User>(`${this.apiBaseUrl}/users`, userData)
      .pipe(map((user) => this.mapUser(user)));
  }

  updateUser(userId: string, updates: Partial<User>): Observable<User> {
    return this.http
      .patch<User>(`${this.apiBaseUrl}/users/${userId}`, updates)
      .pipe(map((user) => this.mapUser(user)));
  }

  toggleUserActive(user: User): Observable<User> {
    return this.http
      .patch<User>(`${this.apiBaseUrl}/users/${user.id}/status`, {
        isActive: !user.isActive,
      })
      .pipe(map((updatedUser) => this.mapUser(updatedUser)));
  }
}
