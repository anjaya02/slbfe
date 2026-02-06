import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, of, throwError } from "rxjs";
import { delay, tap } from "rxjs/operators";
import { Router } from "@angular/router";
import { User, LoginRequest, LoginResponse } from "../models/user.model";

const MOCK_USERS: { email: string; password: string; user: User }[] = [
  {
    email: "admin@slbfe.gov.lk",
    password: "admin123",
    user: {
      id: "USR001",
      name: "Aman Admin",
      email: "admin@slbfe.gov.lk",
      role: "SUPERVISOR",
      avatar: "",
      phone: "+94 77 123 4567",
      location: "Colombo",
      language: "en",
      notificationsEnabled: true,
    },
  },
  {
    email: "officer@slbfe.gov.lk",
    password: "officer123",
    user: {
      id: "USR002",
      name: "Kamal Perera",
      email: "officer@slbfe.gov.lk",
      role: "CASE_OFFICER",
      avatar: "",
      phone: "+94 77 234 5678",
      location: "Colombo",
      language: "en",
      notificationsEnabled: true,
    },
  },
];

@Injectable({ providedIn: "root" })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private tokenKey = "slbfe_auth_token";

  constructor(private router: Router) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const stored = localStorage.getItem(this.tokenKey);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        this.currentUserSubject.next(data.user);
      } catch {
        localStorage.removeItem(this.tokenKey);
      }
    }
  }

  login(req: LoginRequest): Observable<LoginResponse> {
    const found = MOCK_USERS.find(
      (u) => u.email === req.email && u.password === req.password,
    );
    if (!found) {
      return throwError(() => new Error("Invalid email or password")).pipe(
        delay(800),
      );
    }
    const response: LoginResponse = {
      token: "mock-jwt-token-" + Date.now(),
      refreshToken: "mock-refresh-" + Date.now(),
      user: found.user,
    };
    return of(response).pipe(
      delay(1000),
      tap((res) => {
        localStorage.setItem(this.tokenKey, JSON.stringify(res));
        this.currentUserSubject.next(res.user);
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUserSubject.next(null);
    this.router.navigate(["/login"]);
  }

  get isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get token(): string | null {
    const stored = localStorage.getItem(this.tokenKey);
    if (stored) {
      try {
        return JSON.parse(stored).token;
      } catch {
        return null;
      }
    }
    return null;
  }

  hasRole(role: string): boolean {
    return this.currentUser?.role === role;
  }

  updateProfile(updates: Partial<User>): Observable<User> {
    const user = { ...this.currentUser!, ...updates };
    this.currentUserSubject.next(user);
    const stored = localStorage.getItem(this.tokenKey);
    if (stored) {
      const data = JSON.parse(stored);
      data.user = user;
      localStorage.setItem(this.tokenKey, JSON.stringify(data));
    }
    return of(user).pipe(delay(500));
  }
}
