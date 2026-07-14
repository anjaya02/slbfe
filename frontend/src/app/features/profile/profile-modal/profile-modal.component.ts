import { Component, OnDestroy, OnInit } from "@angular/core";
import { MatDialogRef } from "@angular/material/dialog";
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators,
} from "@angular/forms";
import { forkJoin, Observable, Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { ToastService } from "../../../core/services/toast.service";
import { AuthService } from "../../../core/services/auth.service";
import { User } from "../../../core/models/user.model";
import { getNames } from "country-list";

@Component({
  standalone: false,
  selector: "app-profile-modal",
  templateUrl: "./profile-modal.component.html",
  styleUrls: ["./profile-modal.component.scss"],
})
export class ProfileModalComponent implements OnInit, OnDestroy {
  profileForm!: FormGroup;
  user: User | null = null;
  saving = false;
  countries: string[] = getNames().sort();
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  private destroy$ = new Subject<void>();

  constructor(
    private dialogRef: MatDialogRef<ProfileModalComponent>,
    private fb: FormBuilder,
    private authService: AuthService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.currentUser;

    // The password fields are optional until the user starts typing in them.
    // If one password field has a value, the other password fields become required.
    this.profileForm = this.fb.group({
      name: [this.user?.name || "", Validators.required],
      email: [{ value: this.user?.email || "", disabled: true }],
      phone: [this.user?.phone || "", Validators.required],
      location: [this.user?.location || ""],
      workCountry: [this.user?.workCountry || ""],
      currentPassword: ["", [this.currentPasswordRequired]],
      newPassword: ["", [this.newPasswordRequired, Validators.minLength(8)]],
      confirmPassword: ["", [this.confirmPasswordRequiredAndMatches]],
    });

    this.watchPasswordFields();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private currentPasswordRequired(
    control: AbstractControl,
  ): ValidationErrors | null {
    const newPassword = control.parent?.get("newPassword")?.value || "";
    const confirmPassword = control.parent?.get("confirmPassword")?.value || "";

    // Current password is only needed when the user wants to change password.
    if ((newPassword || confirmPassword) && !control.value) {
      return { currentPasswordRequired: true };
    }

    return null;
  }

  private newPasswordRequired(
    control: AbstractControl,
  ): ValidationErrors | null {
    const currentPassword = control.parent?.get("currentPassword")?.value || "";
    const confirmPassword = control.parent?.get("confirmPassword")?.value || "";

    // This avoids sending only the current password without a new password.
    if ((currentPassword || confirmPassword) && !control.value) {
      return { newPasswordRequired: true };
    }

    return null;
  }

  private confirmPasswordRequiredAndMatches(
    control: AbstractControl,
  ): ValidationErrors | null {
    const currentPassword = control.parent?.get("currentPassword")?.value || "";
    const newPassword = control.parent?.get("newPassword")?.value || "";
    const confirmPassword = control.value || "";

    // Empty password fields mean the user is only saving profile details.
    if (!currentPassword && !newPassword && !confirmPassword) {
      return null;
    }

    if (!confirmPassword) {
      return { confirmPasswordRequired: true };
    }

    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  private watchPasswordFields(): void {
    const passwordFields = ["currentPassword", "newPassword", "confirmPassword"];

    // Each password validator reads sibling fields, so update the siblings
    // whenever any one password field changes.
    passwordFields.forEach((changedField) => {
      this.profileForm
        .get(changedField)
        ?.valueChanges.pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          // These three fields depend on each other, so re-check the others.
          passwordFields
            .filter((field) => field !== changedField)
            .forEach((field) => {
              this.profileForm
                .get(field)
                ?.updateValueAndValidity({ onlySelf: true, emitEvent: false });
            });
        });
    });
  }

  private showValidationToast(): void {
    if (
      this.profileForm
        .get("currentPassword")
        ?.hasError("currentPasswordRequired")
    ) {
      this.toast.error("Current password is required to change password");
      return;
    }

    if (this.profileForm.get("newPassword")?.hasError("newPasswordRequired")) {
      this.toast.error("New password is required to change password");
      return;
    }

    if (this.profileForm.get("newPassword")?.hasError("minlength")) {
      this.toast.error("New password must be at least 8 characters");
      return;
    }

    if (
      this.profileForm
        .get("confirmPassword")
        ?.hasError("confirmPasswordRequired")
    ) {
      this.toast.error("Confirm password is required to change password");
      return;
    }

    if (this.profileForm.get("confirmPassword")?.hasError("passwordMismatch")) {
      this.toast.error("New password and confirm password do not match");
      return;
    }

    this.toast.error("Please complete the required profile fields");
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
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.showValidationToast();
      return;
    }

    this.saving = true;
    const {
      name,
      phone,
      location,
      workCountry,
      currentPassword,
      newPassword,
      confirmPassword,
    } = this.profileForm.getRawValue();

    const requests: Observable<unknown>[] = [
      this.authService.updateProfile({ name, phone, location, workCountry }),
    ];

    // Only call the password endpoint when the user entered a new password.
    if (newPassword) {
      requests.push(
        this.authService.updatePassword({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      );
    }

    forkJoin(requests).subscribe({
      next: () => {
        this.saving = false;

        // Changing the password revokes every session on the server,
        // so the user must sign in again with the new password.
        if (newPassword) {
          this.toast.success(
            "Password changed. Please log in again with your new password",
          );
          this.dialogRef.close(true);
          this.authService.logout();
          return;
        }

        this.toast.success("Profile updated successfully");
        this.dialogRef.close(true);
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
