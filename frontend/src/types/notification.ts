export interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  is_read: boolean;
  link_url?: string;
  created_at: string;
}
