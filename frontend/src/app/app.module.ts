import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { HttpClientModule, HTTP_INTERCEPTORS } from "@angular/common/http";

import { TranslateModule, TranslateLoader } from "@ngx-translate/core";
import { TranslateHttpLoader } from "@ngx-translate/http-loader";
import { HttpClient } from "@angular/common/http";
import { NgChartsModule } from "ng2-charts";

import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { SharedModule } from "./shared/shared.module";

// Layout
import { LayoutComponent } from "./layout/layout.component";

// Feature Components
import { LoginComponent } from "./features/auth/login/login.component";
import { DashboardComponent } from "./features/dashboard/dashboard.component";
import { ComplaintListComponent } from "./features/complaints/complaint-list/complaint-list.component";
import { ComplaintDetailComponent } from "./features/complaints/complaint-detail/complaint-detail.component";
import { NotificationListComponent } from "./features/notifications/notification-list/notification-list.component";
import { ReportGeneratorComponent } from "./features/reports/report-generator/report-generator.component";
import { ProfileModalComponent } from "./features/profile/profile-modal/profile-modal.component";
import { SettingsModalComponent } from "./features/profile/settings-modal/settings-modal.component";

// Interceptors
import { AuthInterceptor } from "./core/interceptors/auth.interceptor";
import { ErrorInterceptor } from "./core/interceptors/error.interceptor";

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, "./assets/i18n/", ".json");
}

@NgModule({
  declarations: [
    AppComponent,
    LayoutComponent,
    LoginComponent,
    DashboardComponent,
    ComplaintListComponent,
    ComplaintDetailComponent,
    NotificationListComponent,
    ReportGeneratorComponent,
    ProfileModalComponent,
    SettingsModalComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    SharedModule,
    NgChartsModule,
    TranslateModule.forRoot({
      defaultLanguage: "en",
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
