import { Component, OnInit } from "@angular/core";
import { MatDialogRef } from "@angular/material/dialog";
import { SettingsService } from "../../../core/services/theme.service";
import { Language } from "../../../core/models/user.model";
@Component({
  selector: "app-settings-modal",
  templateUrl: "./settings-modal.component.html",
  styleUrls: ["./settings-modal.component.scss"],
})
export class SettingsModalComponent implements OnInit {
  selectedLanguage = "en";
  notificationsEnabled = true;
  selectedDateFormat = "DD/MM/YYYY";

  languages = [
    { value: "en", label: "English" },
    { value: "si", label: "සිංහල (Sinhala)" },
    { value: "ta", label: "தமிழ் (Tamil)" },
  ];

  dateFormats = [
    { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
    { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
    { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
  ];

  constructor(
    private dialogRef: MatDialogRef<SettingsModalComponent>,
    private settingsService: SettingsService,
  ) {}

  ngOnInit(): void {
    this.settingsService.language$.subscribe(
      (l) => (this.selectedLanguage = l),
    );
    this.settingsService.dateFormat$.subscribe(
      (d) => (this.selectedDateFormat = d),
    );
  }

  onLanguageChange(lang: string): void {
    this.settingsService.setLanguage(lang as Language);
  }

  onDateFormatChange(format: string): void {
    this.settingsService.setDateFormat(format);
  }

  toggleNotifications(): void {
    this.notificationsEnabled = !this.notificationsEnabled;
  }

  close(): void {
    this.dialogRef.close();
  }
}
