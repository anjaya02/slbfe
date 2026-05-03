import { Component, OnInit, OnDestroy, ChangeDetectorRef } from "@angular/core";
import {
  Router,
  NavigationStart,
  NavigationEnd,
  NavigationError,
  NavigationCancel,
} from "@angular/router";
import { Subscription } from "rxjs";
import { AuthService } from "./core/services/auth.service";

@Component({
  standalone: false,
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements OnInit, OnDestroy {
  navState: "idle" | "active" | "done" = "idle";
  private doneTimer: ReturnType<typeof setTimeout> | null = null;
  private routerSub?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.authService.initializeSession().subscribe();
    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        if (this.doneTimer) clearTimeout(this.doneTimer);
        this.navState = "active";
        this.cdr.detectChanges();
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationError ||
        event instanceof NavigationCancel
      ) {
        this.navState = "done";
        this.cdr.detectChanges();
        this.doneTimer = setTimeout(() => {
          this.navState = "idle";
          this.cdr.detectChanges();
        }, 400);
      }
    });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    if (this.doneTimer) clearTimeout(this.doneTimer);
  }
}
