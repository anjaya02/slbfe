import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Language } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private languageSubject = new BehaviorSubject<Language>('en');
  public language$ = this.languageSubject.asObservable();

  private dateFormatSubject = new BehaviorSubject<string>('DD/MM/YYYY');
  public dateFormat$ = this.dateFormatSubject.asObservable();

  constructor() {
    const lang = localStorage.getItem('slbfe_language') as Language | null;
    if (lang) this.languageSubject.next(lang);
    const fmt = localStorage.getItem('slbfe_date_format');
    if (fmt) this.dateFormatSubject.next(fmt);
  }

  setLanguage(language: Language): void {
    this.languageSubject.next(language);
    localStorage.setItem('slbfe_language', language);
  }

  setDateFormat(format: string): void {
    this.dateFormatSubject.next(format);
    localStorage.setItem('slbfe_date_format', format);
  }

  get currentLanguage(): Language {
    return this.languageSubject.value;
  }

  get currentDateFormat(): string {
    return this.dateFormatSubject.value;
  }
}
