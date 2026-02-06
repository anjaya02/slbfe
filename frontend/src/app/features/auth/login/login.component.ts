import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../../core/services/auth.service";

@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"],
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  error = "";
  hidePassword = true;
  currentYear = new Date().getFullYear();

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    if (this.auth.isLoggedIn) {
      this.router.navigate(["/dashboard"]);
      return;
    }
    this.loginForm = this.fb.group({
      email: ["admin@slbfe.gov.lk", [Validators.required, Validators.email]],
      password: ["admin123", [Validators.required, Validators.minLength(8)]],
      rememberMe: [false],
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;
    this.loading = true;
    this.error = "";
    this.auth.login(this.loginForm.value).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(["/dashboard"]);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.message || "Login failed. Please try again.";
      },
    });
  }
}
