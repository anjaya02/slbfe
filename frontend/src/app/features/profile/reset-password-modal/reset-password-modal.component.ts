import { Component, OnDestroy, OnInit } from "@angular/core";
import { MatDialogRef } from "@angular/material/dialog";
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators,
} from "@angular/forms";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { ToastService } from "../../../core/services/toast.service";
import { AuthService } from "../../../core/services/auth.service";

@Component({
  standalone: false,
  selector: "app-reset-password-modal",
  templateUrl: "./reset-password-modal.component.html",
  styleUrls: ["./reset-password-modal.component.scss"],
})
export class ResetPasswordModalComponent implements OnInit, OnDestroy {
  passwordForm!: FormGroup;
  saving = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  private destroy$ = new Subject<void>();

  constructor(
    private dialogRef: MatDialogRef<ResetPasswordModalComponent>,
    private fb: FormBuilder,
    private authService: AuthService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.passwordForm = this.fb.group({
      currentPassword: ["", [Validators.required]],
      newPassword: ["", [Validators.required, Validators.minLength(8)]],
      confirmPassword: ["", [this.confirmPasswordMatches]],
    });

    this.watchPasswordFields();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private confirmPasswordMatches(
    control: AbstractControl,
  ): ValidationErrors | null {
    const newPassword = control.parent?.get("newPassword")?.value || "";
    const confirmPassword = control.value || "";

    if (!confirmPassword) {
      return { required: true };
    }

    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  private watchPasswordFields(): void {
    // Confirm password validity depends on new password, so re-check it
    // whenever the new password changes.
    this.passwordForm
      .get("newPassword")
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.passwordForm
          .get("confirmPassword")
          ?.updateValueAndValidity({ onlySelf: true, emitEvent: false });
      });
  }

  private showValidationToast(): void {
    if (this.passwordForm.get("currentPassword")?.hasError("required")) {
      this.toast.error("Current password is required");
      return;
    }

    if (this.passwordForm.get("newPassword")?.hasError("required")) {
      this.toast.error("New password is required");
      return;
    }

    if (this.passwordForm.get("newPassword")?.hasError("minlength")) {
      this.toast.error("New password must be at least 8 characters");
      return;
    }

    if (this.passwordForm.get("confirmPassword")?.hasError("required")) {
      this.toast.error("Confirm password is required");
      return;
    }

    if (this.passwordForm.get("confirmPassword")?.hasError("passwordMismatch")) {
      this.toast.error("New password and confirm password do not match");
      return;
    }
  }

  toggleCurrentPasswordVisibility(): void {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  save(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      this.showValidationToast();
      return;
    }

    this.saving = true;
    const { currentPassword, newPassword, confirmPassword } =
      this.passwordForm.getRawValue();

    this.authService
      .updatePassword({ currentPassword, newPassword, confirmPassword })
      .subscribe({
        next: () => {
          this.saving = false;

          // Changing the password revokes every session on the server,
          // so the user must sign in again with the new password.
          this.toast.success(
            "Password changed. Please log in again with your new password",
          );
          this.dialogRef.close(true);
          this.authService.logout();
        },
        error: () => {
          this.saving = false;
        },
      });
  }

  close(): void {
    this.dialogRef.close();
  }
}
