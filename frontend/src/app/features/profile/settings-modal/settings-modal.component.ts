import { Component, OnInit, OnDestroy } from "@angular/core";
import { MatDialogRef } from "@angular/material/dialog";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { SettingsService } from "../../../core/services/theme.service";
import { AuthService } from "../../../core/services/auth.service";

@Component({
  selector: "app-settings-modal",
  templateUrl: "./settings-modal.component.html",
  styleUrls: ["./settings-modal.component.scss"],
})
export class SettingsModalComponent implements OnInit, OnDestroy {
  notificationsEnabled = true;
  selectedDateFormat = "DD/MM/YYYY";
  private destroy$ = new Subject<void>();

  dateFormats = [
    { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
    { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
    { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
  ];

  constructor(
    private dialogRef: MatDialogRef<SettingsModalComponent>,
    private settingsService: SettingsService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.settingsService.dateFormat$
      .pipe(takeUntil(this.destroy$))
      .subscribe((d) => (this.selectedDateFormat = d));
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (user) this.notificationsEnabled = user.notificationsEnabled;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onDateFormatChange(format: string): void {
    this.settingsService.setDateFormat(format);
  }

  toggleNotifications(): void {
    this.notificationsEnabled = !this.notificationsEnabled;
    this.authService
      .updateProfile({ notificationsEnabled: this.notificationsEnabled })
      .subscribe();
  }

  close(): void {
    this.dialogRef.close();
  }
}
