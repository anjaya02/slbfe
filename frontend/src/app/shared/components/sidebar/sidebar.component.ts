import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnDestroy,
} from "@angular/core";
import { Router, NavigationEnd } from "@angular/router";
import { Subject } from "rxjs";
import { filter, takeUntil } from "rxjs/operators";
import { AuthService } from "../../../core/services/auth.service";

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

@Component({
  selector: "app-sidebar",
  templateUrl: "./sidebar.component.html",
  styleUrls: ["./sidebar.component.scss"],
})
export class SidebarComponent implements OnDestroy {
  @Input() collapsed = false;
  @Output() navigated = new EventEmitter<void>();
  activeRoute = "";
  private destroy$ = new Subject<void>();

  navItems: NavItem[] = [
    { label: "Home", icon: "dashboard", route: "/dashboard" },
    { label: "Problem List", icon: "person", route: "/complaints" },
    { label: "Notification", icon: "mail", route: "/notifications" },
    {
      label: "Reports",
      icon: "assessment",
      route: "/reports",
      roles: ["SUPERVISOR"],
    },
    {
      label: "Users",
      icon: "group",
      route: "/users",
      roles: ["SUPERVISOR"],
    },
  ];

  constructor(
    public auth: AuthService,
    private router: Router,
  ) {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe((e: any) => {
        this.activeRoute = e.urlAfterRedirects || e.url;
      });
  }

  isActive(route: string): boolean {
    return this.activeRoute.startsWith(route);
  }

  canShow(item: NavItem): boolean {
    if (!item.roles) return true;
    return item.roles.includes(this.auth.currentUser?.role || "");
  }

  navigate(route: string): void {
    this.router.navigate([route]);
    this.navigated.emit();
  }

  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
