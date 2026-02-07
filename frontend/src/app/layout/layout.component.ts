import { Component, OnInit, OnDestroy } from "@angular/core";
import { BreakpointObserver, BreakpointState } from "@angular/cdk/layout";
import { MatDialog } from "@angular/material/dialog";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { ProfileModalComponent } from "../features/profile/profile-modal/profile-modal.component";
import { SettingsModalComponent } from "../features/profile/settings-modal/settings-modal.component";

@Component({
  selector: "app-layout",
  templateUrl: "./layout.component.html",
  styleUrls: ["./layout.component.scss"],
})
export class LayoutComponent implements OnInit, OnDestroy {
  sidebarCollapsed = false;
  private destroy$ = new Subject<void>();

  constructor(
    private dialog: MatDialog,
    private breakpointObserver: BreakpointObserver,
  ) {}

  ngOnInit(): void {
    this.breakpointObserver
      .observe(["(max-width: 1024px)"])
      .pipe(takeUntil(this.destroy$))
      .subscribe((result: BreakpointState) => {
        this.sidebarCollapsed = result.matches;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  openProfile(): void {
    this.dialog.open(ProfileModalComponent, {
      width: "480px",
      panelClass: "custom-dialog",
    });
  }

  openSettings(): void {
    this.dialog.open(SettingsModalComponent, {
      width: "420px",
      panelClass: "custom-dialog",
    });
  }
}
