export type UserRole = "CASE_OFFICER" | "SUPERVISOR";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  location?: string;
  workCountry?: string;
  notificationsEnabled: boolean;
  dateFormat?: string;
  isActive: boolean;
  dateCreated?: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  role: UserRole;
  password: string;
  phone?: string;
  location?: string;
  workCountry?: string;
}

export interface ChangePasswordRequest {
  // The backend checks this against the existing bcrypt hash.
  currentPassword: string;
  // New password is sent only when the user fills the password section.
  newPassword: string;
  // Sent so the backend can reject mismatched client requests too.
  confirmPassword: string;
}

export interface UserSettings {
  notificationsEnabled: boolean;
  dateFormat: string;
}
