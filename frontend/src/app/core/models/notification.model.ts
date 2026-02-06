export type NotificationType =
  | "CASE_UPDATE"
  | "SYSTEM_ALERT"
  | "MENTION"
  | "ASSIGNMENT";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  timestamp: Date;
  link?: string;
  icon?: string;
}
