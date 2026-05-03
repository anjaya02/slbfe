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
}

export interface UserSettings {
  notificationsEnabled: boolean;
  dateFormat: string;
}
