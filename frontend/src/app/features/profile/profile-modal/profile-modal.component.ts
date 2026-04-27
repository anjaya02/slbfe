import { Component, OnInit } from "@angular/core";
import { MatDialogRef } from "@angular/material/dialog";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ToastService } from "../../../core/services/toast.service";
import { AuthService } from "../../../core/services/auth.service";
import { User } from "../../../core/models/user.model";

@Component({
  standalone: false,
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
    private toast: ToastService,
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

  save(): void {
    if (this.profileForm.invalid) return;
    this.saving = true;
    const updates = this.profileForm.getRawValue();
    this.authService.updateProfile(updates).subscribe({
      next: () => {
        this.saving = false;
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
