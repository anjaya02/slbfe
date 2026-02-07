import { Component, OnInit, OnDestroy } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatTableDataSource } from "@angular/material/table";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { AuthService } from "../../core/services/auth.service";
import { User, UserRole } from "../../core/models/user.model";
import { UserFormDialogComponent } from "./user-form-dialog/user-form-dialog.component";

@Component({
  selector: "app-user-management",
  templateUrl: "./user-management.component.html",
  styleUrls: ["./user-management.component.scss"],
})
export class UserManagementComponent implements OnInit, OnDestroy {
  displayedColumns = ["name", "email", "role", "location", "status", "actions"];
  dataSource = new MatTableDataSource<User>([]);
  loading = true;
  error = false;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsers(): void {
    this.loading = true;
    this.error = false;
    this.authService
      .getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          this.dataSource.data = users;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.error = true;
        },
      });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      width: "500px",
      panelClass: "custom-dialog",
      data: { mode: "create" },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result: any) => {
        if (result) {
          this.authService
            .createUser(result)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.snackBar.open("User created successfully", "Close", {
                  duration: 3000,
                  panelClass: ["success-snackbar"],
                });
                this.loadUsers();
              },
              error: () => {
                this.snackBar.open("Failed to create user", "Close", {
                  duration: 3000,
                  panelClass: ["error-snackbar"],
                });
              },
            });
        }
      });
  }

  openEditDialog(user: User): void {
    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      width: "500px",
      panelClass: "custom-dialog",
      data: { mode: "edit", user },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result: any) => {
        if (result) {
          this.authService
            .updateUser(user.id, result)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.snackBar.open("User updated successfully", "Close", {
                  duration: 3000,
                  panelClass: ["success-snackbar"],
                });
                this.loadUsers();
              },
              error: () => {
                this.snackBar.open("Failed to update user", "Close", {
                  duration: 3000,
                  panelClass: ["error-snackbar"],
                });
              },
            });
        }
      });
  }

  toggleUserStatus(user: User): void {
    this.authService
      .toggleUserActive(user.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.snackBar.open(
            `${updated.name} is now ${updated.isActive ? "active" : "deactivated"}`,
            "Close",
            { duration: 3000, panelClass: ["success-snackbar"] },
          );
          this.loadUsers();
        },
        error: () => {
          this.snackBar.open("Failed to update user status", "Close", {
            duration: 3000,
            panelClass: ["error-snackbar"],
          });
        },
      });
  }

  getRoleBadgeClass(role: UserRole): string {
    return role === "SUPERVISOR" ? "badge-supervisor" : "badge-officer";
  }

  getRoleLabel(role: UserRole): string {
    return role === "SUPERVISOR" ? "Supervisor" : "Case Officer";
  }
}
