import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

// Angular Material
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatBadgeModule } from "@angular/material/badge";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatDialogModule } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatTableModule } from "@angular/material/table";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatSortModule } from "@angular/material/sort";
import { MatMenuModule } from "@angular/material/menu";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatChipsModule } from "@angular/material/chips";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatNativeDateModule } from "@angular/material/core";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatTabsModule } from "@angular/material/tabs";
import { MatProgressBarModule } from "@angular/material/progress-bar";

// Shared Components
import { SidebarComponent } from "./components/sidebar/sidebar.component";
import { HeaderComponent } from "./components/header/header.component";
import { StatusStepperComponent } from "./components/status-stepper/status-stepper.component";
import { LoadingComponent } from "./components/loading/loading.component";

// Pipes & Directives
import { TimeAgoPipe } from "./pipes/time-ago.pipe";
import { StatusColorPipe } from "./pipes/status-color.pipe";
import { HasRoleDirective } from "./directives/has-role.directive";

const MATERIAL_MODULES = [
  MatIconModule,
  MatButtonModule,
  MatTooltipModule,
  MatBadgeModule,
  MatSnackBarModule,
  MatDialogModule,
  MatFormFieldModule,
  MatInputModule,
  MatSelectModule,
  MatCheckboxModule,
  MatTableModule,
  MatPaginatorModule,
  MatSortModule,
  MatMenuModule,
  MatProgressSpinnerModule,
  MatChipsModule,
  MatDatepickerModule,
  MatNativeDateModule,
  MatSlideToggleModule,
  MatTabsModule,
  MatProgressBarModule,
];

@NgModule({
  declarations: [
    SidebarComponent,
    HeaderComponent,
    StatusStepperComponent,
    LoadingComponent,
    TimeAgoPipe,
    StatusColorPipe,
    HasRoleDirective,
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    ...MATERIAL_MODULES,
  ],
  exports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    ...MATERIAL_MODULES,
    SidebarComponent,
    HeaderComponent,
    StatusStepperComponent,
    LoadingComponent,
    TimeAgoPipe,
    StatusColorPipe,
    HasRoleDirective,
  ],
})
export class SharedModule {}
