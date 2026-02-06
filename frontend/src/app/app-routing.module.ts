import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { LayoutComponent } from "./layout/layout.component";
import { LoginComponent } from "./features/auth/login/login.component";
import { DashboardComponent } from "./features/dashboard/dashboard.component";
import { ComplaintListComponent } from "./features/complaints/complaint-list/complaint-list.component";
import { ComplaintDetailComponent } from "./features/complaints/complaint-detail/complaint-detail.component";
import { NotificationListComponent } from "./features/notifications/notification-list/notification-list.component";
import { ReportGeneratorComponent } from "./features/reports/report-generator/report-generator.component";

import { AuthGuard } from "./core/guards/auth.guard";
import { RoleGuard } from "./core/guards/role.guard";

const routes: Routes = [
  { path: "login", component: LoginComponent },
  {
    path: "",
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: "", redirectTo: "dashboard", pathMatch: "full" },
      { path: "dashboard", component: DashboardComponent },
      { path: "complaints", component: ComplaintListComponent },
      { path: "complaints/:id", component: ComplaintDetailComponent },
      { path: "notifications", component: NotificationListComponent },
      {
        path: "reports",
        component: ReportGeneratorComponent,
        canActivate: [RoleGuard],
        data: { roles: ["SUPERVISOR"] },
      },
    ],
  },
  { path: "**", redirectTo: "" },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
