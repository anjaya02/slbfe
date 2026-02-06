import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  OnInit,
} from "@angular/core";
import { AuthService } from "../../core/services/auth.service";

@Directive({ selector: "[appHasRole]" })
export class HasRoleDirective implements OnInit {
  @Input("appHasRole") roles: string[] = [];

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    const userRole = this.auth.currentUser?.role;
    if (userRole && this.roles.includes(userRole)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
