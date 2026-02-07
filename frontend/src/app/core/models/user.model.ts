export type UserRole = "CASE_OFFICER" | "SUPERVISOR";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  location?: string;
  notificationsEnabled: boolean;
  isActive: boolean;
  dateCreated?: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface UserSettings {
  notificationsEnabled: boolean;
  dateFormat: string;
}
