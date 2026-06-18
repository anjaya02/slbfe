import { Component, Inject, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { User, UserRole } from "../../../core/models/user.model";
import { getNames } from "country-list";

export interface UserFormDialogData {
  mode: "create" | "edit";
  user?: User;
}

@Component({
  standalone: false,
  selector: "app-user-form-dialog",
  templateUrl: "./user-form-dialog.component.html",
  styleUrls: ["./user-form-dialog.component.scss"],
})
export class UserFormDialogComponent implements OnInit {
  form!: FormGroup;
  mode: "create" | "edit";
  roles: { value: UserRole; label: string }[] = [
    { value: "CASE_OFFICER", label: "Case Officer" },
    { value: "SUPERVISOR", label: "Supervisor" },
  ];

  countries: string[] = getNames().sort();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<UserFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UserFormDialogData,
  ) {
    this.mode = data.mode;
  }

  ngOnInit(): void {
    const controls: Record<string, any> = {
      name: [
        this.data.user?.name || "",
        [Validators.required, Validators.minLength(2)],
      ],
      email: [
        this.data.user?.email || "",
        [Validators.required, Validators.email],
      ],
      role: [this.data.user?.role || "CASE_OFFICER", Validators.required],
      phone: [this.data.user?.phone || ""],
      location: [this.data.user?.location || ""],
      workCountry: [this.data.user?.workCountry || ""],
    };

    if (this.mode === "create") {
      controls["password"] = [
        "",
        [Validators.required, Validators.minLength(8)],
      ];
    }

    this.form = this.fb.group(controls);
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
