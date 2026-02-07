import { Component, ElementRef, EventEmitter, HostListener, Output } from "@angular/core";
import { trigger, transition, style, animate } from "@angular/animations";
import { AuthService } from "../../../core/services/auth.service";
import { NotificationService } from "../../../core/services/notification.service";
import { MatDialog } from "@angular/material/dialog";
import { ConfirmDialogComponent } from "../confirm-dialog/confirm-dialog.component";

@Component({
  selector: "app-header",
  templateUrl: "./header.component.html",
  styleUrls: ["./header.component.scss"],
  animations: [
    trigger('fadeSlideDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-8px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(-8px)' }))
      ])
    ])
  ]
})
export class HeaderComponent {
  @Output() profileClicked = new EventEmitter<void>();
  @Output() settingsClicked = new EventEmitter<void>();
  @Output() menuToggle = new EventEmitter<void>();

  showUserMenu = false;

  constructor(
    public auth: AuthService,
    public notificationService: NotificationService,
    private elementRef: ElementRef,
    private dialog: MatDialog
  ) {}

  onLogout(): void {
    this.closeUserMenu();
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      panelClass: 'confirm-dialog-container',
      data: {
        title: 'Confirm Logout',
        message: 'Are you sure you want to log out of your account?',
        confirmText: 'Log Out',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.auth.logout();
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showUserMenu && !this.elementRef.nativeElement.querySelector('.user-menu-wrapper')?.contains(event.target as Node)) {
      this.showUserMenu = false;
    }
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  toggleNotifications(): void {
    if (this.auth.currentUser) {
      const newState = !this.auth.currentUser.notificationsEnabled;
      this.auth.updateProfile({ notificationsEnabled: newState }).subscribe();
    }
  }

  get unreadCount(): number {
    return this.notificationService.getUnreadCount();
  }
}
