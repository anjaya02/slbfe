import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { AuthService } from "./auth.service";

@Injectable({ providedIn: "root" })
export class SettingsService {
  private dateFormatSubject = new BehaviorSubject<string>("DD/MM/YYYY");
  public dateFormat$ = this.dateFormatSubject.asObservable();

  constructor(private authService: AuthService) {
    this.authService.currentUser$.subscribe((user) => {
      this.dateFormatSubject.next(user?.dateFormat || "DD/MM/YYYY");
    });
  }

  setDateFormat(format: string): void {
    this.dateFormatSubject.next(format);
  }

  get currentDateFormat(): string {
    return this.dateFormatSubject.value;
  }
}
