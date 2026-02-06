import { Component, OnInit } from "@angular/core";
import { MatDialogRef } from "@angular/material/dialog";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MatSnackBar } from "@angular/material/snack-bar";
import { AuthService } from "../../../core/services/auth.service";
import { User } from "../../../core/models/user.model";

@Component({
  selector: "app-profile-modal",
  templateUrl: "./profile-modal.component.html",
  styleUrls: ["./profile-modal.component.scss"],
})
export class ProfileModalComponent implements OnInit {
  profileForm!: FormGroup;
  user: User | null = null;
  saving = false;

  constructor(
    private dialogRef: MatDialogRef<ProfileModalComponent>,
    private fb: FormBuilder,
    private authService: AuthService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.currentUser;
    this.profileForm = this.fb.group({
      name: [this.user?.name || "", Validators.required],
      email: [{ value: this.user?.email || "", disabled: true }],
      phone: [this.user?.phone || "", Validators.required],
      location: [this.user?.location || ""],
    });
  }

  getInitials(): string {
    if (!this.user?.name) return "?";
    return this.user.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  }

  save(): void {
    if (this.profileForm.invalid) return;
    this.saving = true;
    const updates = this.profileForm.getRawValue();
    this.authService.updateProfile(updates);
    setTimeout(() => {
      this.saving = false;
      this.snackBar.open("Profile updated successfully", "Close", {
        duration: 3000,
        panelClass: ["success-snackbar"],
      });
      this.dialogRef.close(true);
    }, 600);
  }

  close(): void {
    this.dialogRef.close();
  }
}
