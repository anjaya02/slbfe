export type UserRole = "CASE_OFFICER" | "SUPERVISOR";
export type Language = "en" | "si" | "ta";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  location?: string;
  language: Language;
  notificationsEnabled: boolean;
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
  language: Language;
  notificationsEnabled: boolean;
  dateFormat: string;
}
