export type LabEvent =
  | {
      type: "EQUIPMENT_CHECKOUT";
      actor: string;
      equipmentId: string;
      equipmentName: string;
      quantity: number;
      studentEmail: string;
      dueAt: Date | null;
      remainingStock: number;
      minStockAlert: number;
    }
  | {
      type: "EQUIPMENT_RETURNED";
      actor: string;
      equipmentId: string;
      equipmentName: string;
      quantity: number;
      condition: string;
      fineAmount: number;
    }
  | {
      type: "STOCK_DROPPED";
      actor: string;
      equipmentId: string;
      equipmentName: string;
      remainingStock: number;
      minStockAlert: number;
    }
  | {
      type: "RESERVATION_CREATED";
      actor: string;
      reservationId: string;
      workbench: string;
      equipmentName?: string | null;
      startTime: Date;
      endTime: Date;
    }
  | {
      type: "FINE_SETTLED";
      actor: string;
      fineId: string;
      studentId: string;
      amount: number;
    };

export interface LabEventObserver {
  readonly name: string;
  update(event: LabEvent): Promise<void>;
}

export interface NotificationDispatcher {
  send(to: string, subject: string, body: string): Promise<void>;
}

export interface AuditLogWriter {
  write(entry: {
    eventType: string;
    actor: string;
    targetId?: string;
    targetName?: string;
    summary: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

/**
 * Subject / Publisher in the Observer pattern.
 */
export class LabEventPublisher {
  private observers: LabEventObserver[] = [];

  attach(observer: LabEventObserver): void {
    if (!this.observers.some((o) => o.name === observer.name)) {
      this.observers.push(observer);
    }
  }

  detach(observerName: string): void {
    this.observers = this.observers.filter((o) => o.name !== observerName);
  }

  getObserverCount(): number {
    return this.observers.length;
  }

  async notify(event: LabEvent): Promise<void> {
    await Promise.all(this.observers.map((observer) => observer.update(event)));
  }
}

/**
 * Dispatches due-date confirmation / return reminders to students.
 */
export class DueReminderObserver implements LabEventObserver {
  readonly name = "DueReminderObserver";

  constructor(private readonly dispatcher: NotificationDispatcher) {}

  async update(event: LabEvent): Promise<void> {
    if (event.type === "EQUIPMENT_CHECKOUT" && event.dueAt) {
      await this.dispatcher.send(
        event.studentEmail,
        `LabVault Checkout Confirmation: ${event.equipmentName}`,
        `Checked out ${event.quantity}x ${event.equipmentName}. Due by ${event.dueAt.toISOString()}.`
      );
    }
  }
}

/**
 * Alerts lab officers when available stock reaches or falls below minStockAlert.
 */
export class LowStockAlertObserver implements LabEventObserver {
  readonly name = "LowStockAlertObserver";

  constructor(
    private readonly dispatcher: NotificationDispatcher,
    private readonly labOfficerEmail = "lab-officer@cse.buet.ac.bd"
  ) {}

  async update(event: LabEvent): Promise<void> {
    if (
      (event.type === "EQUIPMENT_CHECKOUT" || event.type === "STOCK_DROPPED") &&
      event.remainingStock <= event.minStockAlert
    ) {
      await this.dispatcher.send(
        this.labOfficerEmail,
        `[LabVault Low Stock] ${event.equipmentName}`,
        `Stock for ${event.equipmentName} is at ${event.remainingStock} (threshold: ${event.minStockAlert}).`
      );
    }
  }
}

/**
 * Records an immutable audit trail entry for every domain event.
 */
export class AuditLogObserver implements LabEventObserver {
  readonly name = "AuditLogObserver";

  constructor(private readonly writer: AuditLogWriter) {}

  async update(event: LabEvent): Promise<void> {
    switch (event.type) {
      case "EQUIPMENT_CHECKOUT":
        await this.writer.write({
          eventType: event.type,
          actor: event.actor,
          targetId: event.equipmentId,
          targetName: event.equipmentName,
          summary: `Checked out ${event.quantity}x ${event.equipmentName}`,
          metadata: {
            quantity: event.quantity,
            dueAt: event.dueAt ? event.dueAt.toISOString() : null,
            remainingStock: event.remainingStock,
          },
        });
        break;
      case "EQUIPMENT_RETURNED":
        await this.writer.write({
          eventType: event.type,
          actor: event.actor,
          targetId: event.equipmentId,
          targetName: event.equipmentName,
          summary: `Returned ${event.quantity}x ${event.equipmentName} (${event.condition}, fine: ৳${event.fineAmount})`,
          metadata: {
            quantity: event.quantity,
            condition: event.condition,
            fineAmount: event.fineAmount,
          },
        });
        break;
      case "STOCK_DROPPED":
        await this.writer.write({
          eventType: "LOW_STOCK_ALERT",
          actor: event.actor,
          targetId: event.equipmentId,
          targetName: event.equipmentName,
          summary: `Low stock alert for ${event.equipmentName} (${event.remainingStock} left)`,
          metadata: {
            remainingStock: event.remainingStock,
            minStockAlert: event.minStockAlert,
          },
        });
        break;
      case "RESERVATION_CREATED":
        await this.writer.write({
          eventType: event.type,
          actor: event.actor,
          targetId: event.reservationId,
          targetName: event.equipmentName ?? event.workbench,
          summary: `Reserved ${event.workbench} (${event.startTime.toISOString()} – ${event.endTime.toISOString()})`,
          metadata: {
            workbench: event.workbench,
          },
        });
        break;
      case "FINE_SETTLED":
        await this.writer.write({
          eventType: event.type,
          actor: event.actor,
          targetId: event.fineId,
          targetName: event.studentId,
          summary: `Settled fine of ৳${event.amount} for student ${event.studentId}`,
          metadata: {
            amount: event.amount,
          },
        });
        break;
    }
  }
}
