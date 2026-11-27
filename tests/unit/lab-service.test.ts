import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationDispatcher } from "@/lib/patterns/lab-event-observer";
import type { LabRepository } from "@/lib/repositories/lab-repository";
import { LabService, LabServiceError } from "@/lib/services/lab-service";
import type { StudentIdVerifier } from "@/lib/services/student-verifier";
import type { EquipmentDTO, LoanDTO } from "@/lib/types";

function createMockRepository(): LabRepository {
  return {
    listEquipment: vi.fn().mockResolvedValue([]),
    getEquipmentById: vi.fn().mockResolvedValue(null),
    getEquipmentBySku: vi.fn().mockResolvedValue(null),
    createEquipment: vi.fn(),
    updateEquipment: vi.fn(),
    deleteEquipment: vi.fn(),
    listLoans: vi.fn().mockResolvedValue([]),
    getLoanById: vi.fn().mockResolvedValue(null),
    createLoan: vi.fn(),
    markLoanReturned: vi.fn(),
    listFines: vi.fn().mockResolvedValue([]),
    getFineById: vi.fn().mockResolvedValue(null),
    createFine: vi.fn(),
    updateFineStatus: vi.fn(),
    listReservations: vi.fn().mockResolvedValue([]),
    findOverlappingReservation: vi.fn().mockResolvedValue(null),
    hasConfirmedReservationForEquipment: vi.fn().mockResolvedValue(false),
    createReservation: vi.fn(),
    updateReservationStatus: vi.fn(),
    listAuditLogs: vi.fn().mockResolvedValue([]),
    createAuditLog: vi.fn().mockResolvedValue({
      id: "audit_1",
      eventType: "TEST",
      actor: "SYSTEM",
      targetId: null,
      targetName: null,
      summary: "ok",
      metadata: null,
      createdAt: new Date().toISOString(),
    }),
  };
}

describe("LabService (Mocked Repository, StudentVerifier & Notifier)", () => {
  let repo: LabRepository;
  let verifier: StudentIdVerifier;
  let notifier: NotificationDispatcher;
  let service: LabService;

  const sampleStm32: EquipmentDTO = {
    id: "eq_stm32",
    name: "STM32 Nucleo-F446RE",
    sku: "MCU-STM32-F446",
    serialNumber: "SN-01",
    category: "ReturnableComponent",
    description: "ARM Cortex-M4 board",
    totalStock: 10,
    availableStock: 5,
    minStockAlert: 3,
    replacementCost: 28.5,
    location: "Rack A1",
    createdAt: "2026-11-27T00:00:00.000Z",
    updatedAt: "2026-11-27T00:00:00.000Z",
  };

  beforeEach(() => {
    repo = createMockRepository();
    verifier = {
      verify: vi.fn().mockResolvedValue({ valid: true }),
    };
    notifier = {
      send: vi.fn().mockResolvedValue(undefined),
    };
    service = new LabService({
      repository: repo,
      studentVerifier: verifier,
      notifier,
    });
  });

  it("checks out equipment, updates stock, and notifies observers", async () => {
    vi.mocked(repo.getEquipmentById).mockResolvedValue(sampleStm32);
    vi.mocked(repo.updateEquipment).mockResolvedValue({
      ...sampleStm32,
      availableStock: 2,
    });
    vi.mocked(repo.createLoan).mockResolvedValue({
      id: "loan_1",
      equipmentId: "eq_stm32",
      equipmentName: "STM32 Nucleo-F446RE",
      studentId: "2103097",
      studentName: "Rafiqul Islam",
      studentEmail: "2103097@student.ruet.ac.bd",
      quantity: 3,
      borrowedAt: "2026-11-27T10:00:00.000Z",
      dueAt: "2026-12-04T10:00:00.000Z",
      returnedAt: null,
      status: "Active",
      conditionOnReturn: null,
      notes: null,
      requiresReturn: true,
      fine: null,
    });

    const loan = await service.checkoutEquipment({
      equipmentId: "eq_stm32",
      studentId: "2103097",
      studentName: "Rafiqul Islam",
      studentEmail: "2103097@student.ruet.ac.bd",
      quantity: 3,
    });

    expect(loan.id).toBe("loan_1");
    expect(repo.updateEquipment).toHaveBeenCalledWith("eq_stm32", {
      availableStock: 2,
    });
    // Remaining stock 2 <= minStockAlert 3 -> triggers both due reminder + low stock alert
    expect(notifier.send).toHaveBeenCalledTimes(2);
    expect(repo.createAuditLog).toHaveBeenCalledTimes(1);
  });

  it("rejects checkout when StudentIdVerifier fails", async () => {
    vi.mocked(verifier.verify).mockResolvedValue({
      valid: false,
      reason: "Invalid student ID",
    });

    await expect(
      service.checkoutEquipment({
        equipmentId: "eq_stm32",
        studentId: "bad",
        studentName: "Test",
        studentEmail: "bad",
        quantity: 1,
      })
    ).rejects.toThrow(LabServiceError);
  });

  it("processes return with damage inspection and creates a Fine", async () => {
    const activeLoan: LoanDTO = {
      id: "loan_2",
      equipmentId: "eq_stm32",
      studentId: "2103097",
      studentName: "Rafiqul Islam",
      studentEmail: "2103097@student.ruet.ac.bd",
      quantity: 1,
      borrowedAt: "2026-11-15T10:00:00.000Z",
      dueAt: "2026-11-22T10:00:00.000Z",
      returnedAt: null,
      status: "Active",
      conditionOnReturn: null,
      notes: null,
      requiresReturn: true,
    };

    vi.mocked(repo.getLoanById).mockResolvedValue(activeLoan);
    vi.mocked(repo.getEquipmentById).mockResolvedValue(sampleStm32);
    vi.mocked(repo.markLoanReturned).mockResolvedValue({
      ...activeLoan,
      status: "Returned",
      conditionOnReturn: "Broken",
    });
    vi.mocked(repo.createFine).mockResolvedValue({
      id: "fine_99",
      loanId: "loan_2",
      studentId: "2103097",
      amount: 24.38,
      reason: "Broken",
      strategyUsed: "DamagedItemFineStrategy",
      condition: "Broken",
      daysLate: 2,
      status: "Pending",
      createdAt: "2026-11-24T10:00:00.000Z",
      settledAt: null,
    });

    const result = await service.returnEquipment({
      loanId: "loan_2",
      condition: "Broken",
      returnedAt: new Date("2026-11-24T10:00:00.000Z"),
    });

    expect(result.loan.status).toBe("Returned");
    expect(result.fine?.id).toBe("fine_99");
    expect(repo.createFine).toHaveBeenCalledWith(
      expect.objectContaining({
        strategyUsed: "DamagedItemFineStrategy",
        condition: "Broken",
        daysLate: 2,
      })
    );
  });

  it("prevents overlapping lab slot reservations", async () => {
    vi.mocked(repo.findOverlappingReservation).mockResolvedValue({
      id: "res_existing",
      equipmentId: "eq_rigol",
      workbench: "Bench 01",
      studentId: "2203125",
      studentName: "Existing Student",
      purpose: "Signal test",
      startTime: "2026-11-28T09:00:00.000Z",
      endTime: "2026-11-28T11:00:00.000Z",
      status: "Confirmed",
      createdAt: "2026-11-27T00:00:00.000Z",
    });

    await expect(
      service.createReservation({
        workbench: "Bench 01",
        studentId: "2103097",
        studentName: "Rafiqul Islam",
        purpose: "Oscilloscope check",
        startTime: new Date("2026-11-28T10:00:00.000Z"),
        endTime: new Date("2026-11-28T12:00:00.000Z"),
      })
    ).rejects.toThrow("Slot conflict");
  });

  it("computes dashboard analytics KPIs", async () => {
    vi.mocked(repo.listEquipment).mockResolvedValue([sampleStm32]);
    vi.mocked(repo.listLoans).mockResolvedValue([
      {
        id: "l1",
        equipmentId: "eq_stm32",
        studentId: "2103097",
        studentName: "Test",
        studentEmail: "2103097@student.ruet.ac.bd",
        quantity: 1,
        borrowedAt: "2026-11-20T00:00:00Z",
        dueAt: "2026-11-22T00:00:00Z",
        returnedAt: null,
        status: "Overdue",
        conditionOnReturn: null,
        notes: null,
        requiresReturn: true,
      },
    ]);
    vi.mocked(repo.listFines).mockResolvedValue([
      {
        id: "f1",
        loanId: "l1",
        studentId: "2103097",
        amount: 15.5,
        reason: "Late",
        strategyUsed: "StandardLateFeeStrategy",
        condition: "Good",
        daysLate: 3,
        status: "Pending",
        createdAt: "2026-11-27T00:00:00Z",
        settledAt: null,
      },
    ]);

    const analytics = await service.getAnalytics();
    expect(analytics.totalEquipmentCount).toBe(1);
    expect(analytics.activeLoansCount).toBe(1);
    expect(analytics.overdueLoansCount).toBe(1);
    expect(analytics.pendingFinesAmount).toBe(15.5);
  });

  it("handles equipment CRUD, duplicate SKU rejection, and fine settlement", async () => {
    vi.mocked(repo.getEquipmentBySku).mockResolvedValueOnce(sampleStm32);
    await expect(
      service.createEquipment({
        name: "STM32",
        sku: "MCU-STM32-F446",
        category: "ReturnableComponent",
        description: "Duplicate",
        totalStock: 5,
        availableStock: 5,
        minStockAlert: 2,
        replacementCost: 28.5,
        location: "Rack A1",
      })
    ).rejects.toThrow("already exists");

    vi.mocked(repo.getEquipmentBySku).mockResolvedValueOnce(null);
    vi.mocked(repo.createEquipment).mockResolvedValueOnce(sampleStm32);
    const created = await service.createEquipment({
      name: "STM32",
      sku: "NEW-SKU",
      category: "ReturnableComponent",
      description: "New board",
      totalStock: 5,
      availableStock: 5,
      minStockAlert: 2,
      replacementCost: 28.5,
      location: "Rack A1",
    });
    expect(created.id).toBe("eq_stm32");

    vi.mocked(repo.getEquipmentById).mockResolvedValueOnce(sampleStm32);
    vi.mocked(repo.updateEquipment).mockResolvedValueOnce({
      ...sampleStm32,
      availableStock: 1,
    });
    const updated = await service.updateEquipment("eq_stm32", {
      availableStock: 1,
    });
    expect(updated.availableStock).toBe(1);

    vi.mocked(repo.getEquipmentById).mockResolvedValueOnce(sampleStm32);
    await service.deleteEquipment("eq_stm32");
    expect(repo.deleteEquipment).toHaveBeenCalledWith("eq_stm32");

    vi.mocked(repo.getFineById).mockResolvedValueOnce({
      id: "fine_1",
      loanId: "loan_1",
      studentId: "2103097",
      amount: 100,
      reason: "Late",
      strategyUsed: "StandardLateFeeStrategy",
      condition: "Good",
      daysLate: 2,
      status: "Pending",
      createdAt: "2026-11-27T00:00:00Z",
      settledAt: null,
    });
    vi.mocked(repo.updateFineStatus).mockResolvedValueOnce({
      id: "fine_1",
      loanId: "loan_1",
      studentId: "2103097",
      amount: 100,
      reason: "Late",
      strategyUsed: "StandardLateFeeStrategy",
      condition: "Good",
      daysLate: 2,
      status: "Settled",
      createdAt: "2026-11-27T00:00:00Z",
      settledAt: "2026-11-27T12:00:00Z",
    });
    const settled = await service.settleFine("fine_1", "Settled");
    expect(settled.status).toBe("Settled");
  });
});
