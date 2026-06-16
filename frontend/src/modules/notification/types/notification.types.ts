export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'invitation';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
}

export interface CreateNotificationDTO {
  type?: NotificationType;
  title: string;
  message: string;
  data?: any;
}
