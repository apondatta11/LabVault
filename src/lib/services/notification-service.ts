import type { NotificationDispatcher } from "@/lib/patterns/lab-event-observer";

export interface DispatchedNotification {
  to: string;
  subject: string;
  body: string;
  sentAt: string;
}

/**
 * In-app/console notification dispatcher. Can be swapped for Nodemailer/SMTP in production.
 */
export class ConsoleNotificationDispatcher implements NotificationDispatcher {
  public readonly history: DispatchedNotification[] = [];

  async send(to: string, subject: string, body: string): Promise<void> {
    const entry: DispatchedNotification = {
      to,
      subject,
      body,
      sentAt: new Date().toISOString(),
    };
    this.history.unshift(entry);
    if (this.history.length > 50) {
      this.history.pop();
    }
  }
}
