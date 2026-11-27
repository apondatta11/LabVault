import { describe, expect, it, vi } from "vitest";
import {
  AuditLogObserver,
  DueReminderObserver,
  LabEventPublisher,
  LowStockAlertObserver,
  type AuditLogWriter,
  type NotificationDispatcher,
} from "@/lib/patterns/lab-event-observer";

describe("LabEventPublisher (Observer Pattern)", () => {
  it("attaches, detaches, and notifies DueReminderObserver, LowStockAlertObserver, and AuditLogObserver", async () => {
    const mockDispatcher: NotificationDispatcher = {
      send: vi.fn().mockResolvedValue(undefined),
    };
    const mockAuditWriter: AuditLogWriter = {
      write: vi.fn().mockResolvedValue(undefined),
    };

    const publisher = new LabEventPublisher();
    const dueObserver = new DueReminderObserver(mockDispatcher);
    const lowStockObserver = new LowStockAlertObserver(mockDispatcher);
    const auditObserver = new AuditLogObserver(mockAuditWriter);

    publisher.attach(dueObserver);
    publisher.attach(dueObserver); // duplicate attach ignored
    publisher.attach(lowStockObserver);
    publisher.attach(auditObserver);

    expect(publisher.getObserverCount()).toBe(3);

    const dueAt = new Date("2026-12-04T10:00:00.000Z");
    await publisher.notify({
      type: "EQUIPMENT_CHECKOUT",
      actor: "2104012",
      equipmentId: "eq_esp32",
      equipmentName: "ESP32-WROOM-32 DevKit",
      quantity: 2,
      studentEmail: "2104012@cse.buet.ac.bd",
      dueAt,
      remainingStock: 2,
      minStockAlert: 4,
    });

    // Due reminder + Low stock alert both fire
    expect(mockDispatcher.send).toHaveBeenCalledTimes(2);
    expect(mockDispatcher.send).toHaveBeenCalledWith(
      "2104012@cse.buet.ac.bd",
      expect.stringContaining("Checkout Confirmation"),
      expect.stringContaining("ESP32-WROOM-32 DevKit")
    );
    expect(mockDispatcher.send).toHaveBeenCalledWith(
      "lab-officer@cse.buet.ac.bd",
      expect.stringContaining("Low Stock"),
      expect.stringContaining("2")
    );

    // Audit log recorded
    expect(mockAuditWriter.write).toHaveBeenCalledTimes(1);
    expect(mockAuditWriter.write).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "EQUIPMENT_CHECKOUT",
        actor: "2104012",
        targetId: "eq_esp32",
      })
    );

    publisher.detach("DueReminderObserver");
    expect(publisher.getObserverCount()).toBe(2);
  });

  it("handles return, reservation, stock drop, and fine settlement events in AuditLogObserver", async () => {
    const mockAuditWriter: AuditLogWriter = {
      write: vi.fn().mockResolvedValue(undefined),
    };
    const publisher = new LabEventPublisher();
    publisher.attach(new AuditLogObserver(mockAuditWriter));

    await publisher.notify({
      type: "EQUIPMENT_RETURNED",
      actor: "2104012",
      equipmentId: "eq_1",
      equipmentName: "STM32",
      quantity: 1,
      condition: "Good",
      fineAmount: 0,
    });

    await publisher.notify({
      type: "RESERVATION_CREATED",
      actor: "2104012",
      reservationId: "res_1",
      workbench: "Bench 01",
      equipmentName: "Oscilloscope",
      startTime: new Date("2026-11-28T09:00:00Z"),
      endTime: new Date("2026-11-28T11:00:00Z"),
    });

    await publisher.notify({
      type: "FINE_SETTLED",
      actor: "LAB_OFFICER",
      fineId: "fine_1",
      studentId: "2104012",
      amount: 10.5,
    });

    expect(mockAuditWriter.write).toHaveBeenCalledTimes(3);
  });
});
