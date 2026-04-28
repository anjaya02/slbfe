import { Component, OnInit, OnDestroy } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ToastService } from "../../core/services/toast.service";
import { MatTableDataSource } from "@angular/material/table";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { AuthService } from "../../core/services/auth.service";
import { User, UserRole } from "../../core/models/user.model";
import { UserFormDialogComponent } from "./user-form-dialog/user-form-dialog.component";

@Component({
  standalone: false,
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
    private toast: ToastService,
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

  isCurrentUser(user: User): boolean {
    return this.authService.currentUser?.id === user.id;
  }

  getStatusActionLabel(user: User): string {
    if (this.isCurrentUser(user)) {
      return "Current user";
    }

    return user.isActive ? "Deactivate user" : "Activate user";
  }

  getStatusActionTooltip(user: User): string {
    if (this.isCurrentUser(user)) {
      return "You can't deactivate your own account";
    }

    return user.isActive ? "Deactivate user" : "Activate user";
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
                this.toast.success("User created successfully");
                this.loadUsers();
              },
              error: () => {},
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
                this.toast.success("User updated successfully");
                this.loadUsers();
              },
              error: () => {},
            });
        }
      });
  }

  toggleUserStatus(user: User): void {
    if (this.isCurrentUser(user)) {
      this.toast.info("You can't deactivate your own account");
      return;
    }

    this.authService
      .toggleUserActive(user)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.toast.success(
            `${updated.name} is now ${updated.isActive ? "active" : "deactivated"}`,
          );
          this.loadUsers();
        },
        error: () => {},
      });
  }

  getRoleBadgeClass(role: UserRole): string {
    return role === "SUPERVISOR" ? "badge-supervisor" : "badge-officer";
  }

  getRoleLabel(role: UserRole): string {
    return role === "SUPERVISOR" ? "Supervisor" : "Case Officer";
  }
}
