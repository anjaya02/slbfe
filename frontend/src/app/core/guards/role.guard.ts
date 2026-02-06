import { Injectable } from "@angular/core";
import {
  CanActivate,
  ActivatedRouteSnapshot,
  Router,
  UrlTree,
} from "@angular/router";
import { AuthService } from "../services/auth.service";

@Injectable({ providedIn: "root" })
export class RoleGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const requiredRoles = route.data["roles"] as string[];
    if (requiredRoles && this.auth.currentUser) {
      if (requiredRoles.includes(this.auth.currentUser.role)) {
        return true;
      }
    }
    return this.router.createUrlTree(["/dashboard"]);
  }
}
