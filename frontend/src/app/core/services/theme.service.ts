import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

@Injectable({ providedIn: "root" })
export class SettingsService {
  private dateFormatSubject = new BehaviorSubject<string>("DD/MM/YYYY");
  public dateFormat$ = this.dateFormatSubject.asObservable();

  constructor() {
    const fmt = localStorage.getItem("slbfe_date_format");
    if (fmt) this.dateFormatSubject.next(fmt);
  }

  setDateFormat(format: string): void {
    this.dateFormatSubject.next(format);
    localStorage.setItem("slbfe_date_format", format);
  }

  get currentDateFormat(): string {
    return this.dateFormatSubject.value;
  }
}
