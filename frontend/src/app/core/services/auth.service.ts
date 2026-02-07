import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, of, timer } from "rxjs";
import { delay, map, switchMap, tap } from "rxjs/operators";
import { Router } from "@angular/router";
import {
  User,
  UserRole,
  LoginRequest,
  LoginResponse,
} from "../models/user.model";

const MOCK_USERS: { email: string; password: string; user: User }[] = [
  {
    email: "admin@slbfe.gov.lk",
    password: "admin123",
    user: {
      id: "USR001",
      name: "Main Admin",
      email: "admin@slbfe.gov.lk",
      role: "SUPERVISOR",
      avatar: "",
      phone: "+94 77 123 4567",
      location: "Colombo",
      notificationsEnabled: true,
      isActive: true,
      dateCreated: new Date("2024-01-15"),
    },
  },
  {
    email: "officer@slbfe.gov.lk",
    password: "officer123",
    user: {
      id: "USR002",
      name: "Iman Fernando",
      email: "officer@slbfe.gov.lk",
      role: "CASE_OFFICER",
      avatar: "",
      phone: "+94 77 234 5678",
      location: "Colombo",
      notificationsEnabled: true,
      isActive: true,
      dateCreated: new Date("2024-02-01"),
    },
  },
  {
    email: "officer2@slbfe.gov.lk",
    password: "officer123",
    user: {
      id: "USR003",
      name: "Kamal Perera",
      email: "officer2@slbfe.gov.lk",
      role: "CASE_OFFICER",
      avatar: "",
      phone: "+94 77 345 6789",
      location: "Kandy",
      notificationsEnabled: true,
      isActive: true,
      dateCreated: new Date("2024-03-10"),
    },
  },
  {
    email: "officer3@slbfe.gov.lk",
    password: "officer123",
    user: {
      id: "USR004",
      name: "Nimal Silva",
      email: "officer3@slbfe.gov.lk",
      role: "CASE_OFFICER",
      avatar: "",
      phone: "+94 77 456 7890",
      location: "Galle",
      notificationsEnabled: true,
      isActive: false,
      dateCreated: new Date("2024-04-20"),
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
      return timer(800).pipe(
        switchMap(() => {
          throw new Error("Invalid email or password");
        }),
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

  // ===== User Management (Supervisor) =====

  getUsers(): Observable<User[]> {
    return of(MOCK_USERS.map((u) => u.user)).pipe(delay(600));
  }

  getCaseOfficers(): Observable<User[]> {
    return of(
      MOCK_USERS.filter(
        (u) => u.user.role === "CASE_OFFICER" && u.user.isActive,
      ).map((u) => u.user),
    ).pipe(delay(300));
  }

  createUser(userData: {
    name: string;
    email: string;
    role: UserRole;
    phone?: string;
    location?: string;
  }): Observable<User> {
    const newUser: User = {
      id: "USR" + String(MOCK_USERS.length + 1).padStart(3, "0"),
      name: userData.name,
      email: userData.email,
      role: userData.role,
      avatar: "",
      phone: userData.phone || "",
      location: userData.location || "",
      notificationsEnabled: true,
      isActive: true,
      dateCreated: new Date(),
    };
    MOCK_USERS.push({
      email: newUser.email,
      password: "default123",
      user: newUser,
    });
    return of(newUser).pipe(delay(500));
  }

  updateUser(userId: string, updates: Partial<User>): Observable<User> {
    const idx = MOCK_USERS.findIndex((u) => u.user.id === userId);
    if (idx === -1) throw new Error("User not found");
    MOCK_USERS[idx].user = { ...MOCK_USERS[idx].user, ...updates };
    if (updates.email) MOCK_USERS[idx].email = updates.email;
    return of(MOCK_USERS[idx].user).pipe(delay(500));
  }

  toggleUserActive(userId: string): Observable<User> {
    const idx = MOCK_USERS.findIndex((u) => u.user.id === userId);
    if (idx === -1) throw new Error("User not found");
    MOCK_USERS[idx].user = {
      ...MOCK_USERS[idx].user,
      isActive: !MOCK_USERS[idx].user.isActive,
    };
    return of(MOCK_USERS[idx].user).pipe(delay(400));
  }
}
