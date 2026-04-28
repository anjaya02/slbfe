import { Component, OnInit, OnDestroy } from "@angular/core";
import { MatDialogRef } from "@angular/material/dialog";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { SettingsService } from "../../../core/services/settings.service";
import { AuthService } from "../../../core/services/auth.service";
import { ToastService } from "../../../core/services/toast.service";

@Component({
  standalone: false,
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
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.settingsService.dateFormat$
      .pipe(takeUntil(this.destroy$))
      .subscribe((d) => (this.selectedDateFormat = d));
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (user) {
          this.notificationsEnabled = user.notificationsEnabled;
          this.selectedDateFormat = user.dateFormat || this.selectedDateFormat;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onDateFormatChange(format: string): void {
    const previousFormat = this.selectedDateFormat;
    this.settingsService.setDateFormat(format);
    this.authService.updatePreferences({ dateFormat: format }).subscribe({
      next: () => {
        this.toast.success("Date format updated");
      },
      error: () => {
        this.settingsService.setDateFormat(previousFormat);
      },
    });
  }

  toggleNotifications(): void {
    const previousValue = this.notificationsEnabled;
    this.notificationsEnabled = !this.notificationsEnabled;
    this.authService
      .updatePreferences({ notificationsEnabled: this.notificationsEnabled })
      .subscribe({
        next: () => {
          this.toast.success(
            this.notificationsEnabled
              ? "Notifications enabled"
              : "Notifications disabled",
          );
        },
        error: () => {
          this.notificationsEnabled = previousValue;
        },
      });
  }

  close(): void {
    this.dialogRef.close();
  }
}
