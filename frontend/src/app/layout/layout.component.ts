import { Component, OnInit } from "@angular/core";
import { BreakpointObserver, BreakpointState } from "@angular/cdk/layout";
import { MatDialog } from "@angular/material/dialog";
import { ProfileModalComponent } from "../features/profile/profile-modal/profile-modal.component";
import { SettingsModalComponent } from "../features/profile/settings-modal/settings-modal.component";

@Component({
  selector: "app-layout",
  templateUrl: "./layout.component.html",
  styleUrls: ["./layout.component.scss"],
})
export class LayoutComponent implements OnInit {
  sidebarCollapsed = false;

  constructor(
    private dialog: MatDialog,
    private breakpointObserver: BreakpointObserver
  ) {}

  ngOnInit(): void {
    this.breakpointObserver
      .observe(["(max-width: 1024px)"])
      .subscribe((result: BreakpointState) => {
        if (result.matches) {
          this.sidebarCollapsed = true;
        } else {
          this.sidebarCollapsed = false;
        }
      });
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
