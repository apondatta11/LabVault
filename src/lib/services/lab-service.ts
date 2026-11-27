import { EquipmentFactory } from "@/lib/patterns/equipment-factory";
import {
  FineCalculatorContext,
  resolveFineStrategy,
} from "@/lib/patterns/fine-strategy";
import {
  AuditLogObserver,
  DueReminderObserver,
  LabEventPublisher,
  LowStockAlertObserver,
  type NotificationDispatcher,
} from "@/lib/patterns/lab-event-observer";
import {
  MemoryLabRepository,
  PrismaLabRepository,
  type CreateEquipmentInput,
  type LabRepository,
  type UpdateEquipmentInput,
} from "@/lib/repositories/lab-repository";
import { ConsoleNotificationDispatcher } from "@/lib/services/notification-service";
import {
  UniversityStudentVerifier,
  type StudentIdVerifier,
} from "@/lib/services/student-verifier";
import type {
  ConditionGrade,
  DashboardAnalyticsDTO,
  EquipmentCategory,
  EquipmentDTO,
  FineDTO,
  FineStatus,
  LoanDTO,
  ReservationDTO,
} from "@/lib/types";

export class LabServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "LabServiceError";
  }
}

export interface LabServiceDeps {
  repository: LabRepository;
  studentVerifier: StudentIdVerifier;
  notifier: NotificationDispatcher;
}

export class LabService {
  private readonly publisher: LabEventPublisher;

  constructor(private readonly deps: LabServiceDeps) {
    this.publisher = new LabEventPublisher();
    this.publisher.attach(new DueReminderObserver(deps.notifier));
    this.publisher.attach(new LowStockAlertObserver(deps.notifier));
    this.publisher.attach(
      new AuditLogObserver({
        write: async (entry) => {
          await deps.repository.createAuditLog(entry);
        },
      })
    );
  }

  getObserverCount(): number {
    return this.publisher.getObserverCount();
  }

  async listEquipment(filters?: {
    search?: string;
    category?: EquipmentCategory | "ALL";
  }): Promise<EquipmentDTO[]> {
    return this.deps.repository.listEquipment(filters);
  }

  async createEquipment(input: CreateEquipmentInput): Promise<EquipmentDTO> {
    const existing = await this.deps.repository.getEquipmentBySku(input.sku);
    if (existing) {
      throw new LabServiceError(
        `Equipment with SKU '${input.sku}' already exists.`,
        409
      );
    }
    const created = await this.deps.repository.createEquipment(input);
    await this.deps.repository.createAuditLog({
      eventType: "EQUIPMENT_CREATED",
      actor: "LAB_OFFICER",
      targetId: created.id,
      targetName: created.name,
      summary: `Added ${created.totalStock}x ${created.name} (${created.sku})`,
    });
    return created;
  }

  async updateEquipment(
    id: string,
    input: UpdateEquipmentInput
  ): Promise<EquipmentDTO> {
    const existing = await this.deps.repository.getEquipmentById(id);
    if (!existing) {
      throw new LabServiceError("Equipment not found.", 404);
    }
    const updated = await this.deps.repository.updateEquipment(id, input);
    if (updated.availableStock <= updated.minStockAlert) {
      await this.publisher.notify({
        type: "STOCK_DROPPED",
        actor: "LAB_OFFICER",
        equipmentId: updated.id,
        equipmentName: updated.name,
        remainingStock: updated.availableStock,
        minStockAlert: updated.minStockAlert,
      });
    }
    return updated;
  }

  async deleteEquipment(id: string): Promise<void> {
    const existing = await this.deps.repository.getEquipmentById(id);
    if (!existing) {
      throw new LabServiceError("Equipment not found.", 404);
    }
    await this.deps.repository.deleteEquipment(id);
  }

  async checkoutEquipment(input: {
    equipmentId: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    quantity: number;
    notes?: string;
    now?: Date;
  }): Promise<LoanDTO> {
    const verification = await this.deps.studentVerifier.verify(
      input.studentId,
      input.studentEmail
    );
    if (!verification.valid) {
      throw new LabServiceError(
        verification.reason ?? "Invalid student credentials.",
        400
      );
    }

    const equipment = await this.deps.repository.getEquipmentById(
      input.equipmentId
    );
    if (!equipment) {
      throw new LabServiceError("Equipment not found.", 404);
    }

    const now = input.now ?? new Date();
    const hasReservation =
      await this.deps.repository.hasConfirmedReservationForEquipment(
        equipment.id,
        input.studentId.trim(),
        now
      );

    const product = EquipmentFactory.create(equipment.category, {
      id: equipment.id,
      name: equipment.name,
      sku: equipment.sku,
      replacementCost: equipment.replacementCost,
      availableStock: equipment.availableStock,
    });

    const validation = product.validateCheckout(
      input.quantity,
      hasReservation,
      now
    );
    if (!validation.allowed) {
      throw new LabServiceError(
        validation.reason ?? "Checkout validation failed.",
        400
      );
    }

    const remainingStock = equipment.availableStock - input.quantity;
    await this.deps.repository.updateEquipment(equipment.id, {
      availableStock: remainingStock,
    });

    const loan = await this.deps.repository.createLoan({
      equipmentId: equipment.id,
      studentId: input.studentId.trim(),
      studentName: input.studentName.trim(),
      studentEmail: input.studentEmail.trim(),
      quantity: input.quantity,
      dueAt: validation.dueAt,
      requiresReturn: validation.requiresReturn,
      notes: input.notes ?? null,
      status: validation.requiresReturn ? "Active" : "Returned",
      returnedAt: validation.requiresReturn ? null : now,
      conditionOnReturn: validation.requiresReturn ? null : "Good",
    });

    await this.publisher.notify({
      type: "EQUIPMENT_CHECKOUT",
      actor: input.studentId.trim(),
      equipmentId: equipment.id,
      equipmentName: equipment.name,
      quantity: input.quantity,
      studentEmail: input.studentEmail.trim(),
      dueAt: validation.dueAt,
      remainingStock,
      minStockAlert: equipment.minStockAlert,
    });

    return loan;
  }

  async returnEquipment(input: {
    loanId: string;
    condition: ConditionGrade;
    policy?: "standard" | "damaged" | "grace";
    returnedAt?: Date;
  }): Promise<{ loan: LoanDTO; fine: FineDTO | null }> {
    const loan = await this.deps.repository.getLoanById(input.loanId);
    if (!loan) {
      throw new LabServiceError("Loan record not found.", 404);
    }
    if (loan.status === "Returned") {
      throw new LabServiceError("This loan has already been returned.", 400);
    }

    const equipment = await this.deps.repository.getEquipmentById(
      loan.equipmentId
    );
    if (!equipment) {
      throw new LabServiceError("Associated equipment not found.", 404);
    }

    const returnedAt = input.returnedAt ?? new Date();
    const dueTime = loan.dueAt ? new Date(loan.dueAt).getTime() : returnedAt.getTime();
    const diffMs = returnedAt.getTime() - dueTime;
    const daysLate = diffMs > 0 ? Math.ceil(diffMs / (24 * 60 * 60 * 1000)) : 0;

    const strategy = resolveFineStrategy(
      input.condition,
      input.policy ?? "standard"
    );
    const context = new FineCalculatorContext(strategy);
    const fineResult = context.compute({
      daysLate,
      condition: input.condition,
      replacementCost: equipment.replacementCost,
      quantity: loan.quantity,
    });

    const updatedLoan = await this.deps.repository.markLoanReturned(
      loan.id,
      input.condition,
      returnedAt
    );

    if (input.condition !== "Lost") {
      await this.deps.repository.updateEquipment(equipment.id, {
        availableStock: Math.min(
          equipment.totalStock,
          equipment.availableStock + loan.quantity
        ),
      });
    }

    let createdFine: FineDTO | null = null;
    if (fineResult.amount > 0) {
      createdFine = await this.deps.repository.createFine({
        loanId: loan.id,
        studentId: loan.studentId,
        amount: fineResult.amount,
        reason: fineResult.reason,
        strategyUsed: fineResult.strategyName,
        condition: input.condition,
        daysLate,
      });
    }

    await this.publisher.notify({
      type: "EQUIPMENT_RETURNED",
      actor: loan.studentId,
      equipmentId: equipment.id,
      equipmentName: equipment.name,
      quantity: loan.quantity,
      condition: input.condition,
      fineAmount: fineResult.amount,
    });

    return { loan: updatedLoan, fine: createdFine };
  }

  async settleFine(
    fineId: string,
    status: FineStatus = "Settled"
  ): Promise<FineDTO> {
    const fine = await this.deps.repository.getFineById(fineId);
    if (!fine) {
      throw new LabServiceError("Fine record not found.", 404);
    }
    const updated = await this.deps.repository.updateFineStatus(fineId, status);
    await this.publisher.notify({
      type: "FINE_SETTLED",
      actor: "LAB_OFFICER",
      fineId: updated.id,
      studentId: updated.studentId,
      amount: updated.amount,
    });
    return updated;
  }

  async createReservation(input: {
    equipmentId?: string | null;
    workbench: string;
    studentId: string;
    studentName: string;
    purpose: string;
    startTime: Date;
    endTime: Date;
  }): Promise<ReservationDTO> {
    if (input.endTime <= input.startTime) {
      throw new LabServiceError(
        "Reservation end time must be after start time.",
        400
      );
    }

    const overlap = await this.deps.repository.findOverlappingReservation(
      input.workbench,
      input.startTime,
      input.endTime
    );
    if (overlap) {
      throw new LabServiceError(
        `Slot conflict: ${input.workbench} is already reserved by ${overlap.studentName} during that window.`,
        409
      );
    }

    const created = await this.deps.repository.createReservation({
      equipmentId: input.equipmentId ?? null,
      workbench: input.workbench,
      studentId: input.studentId.trim(),
      studentName: input.studentName.trim(),
      purpose: input.purpose.trim(),
      startTime: input.startTime,
      endTime: input.endTime,
    });

    await this.publisher.notify({
      type: "RESERVATION_CREATED",
      actor: input.studentId.trim(),
      reservationId: created.id,
      workbench: created.workbench,
      equipmentName: created.equipmentName,
      startTime: input.startTime,
      endTime: input.endTime,
    });

    return created;
  }

  async getAnalytics(): Promise<DashboardAnalyticsDTO> {
    const [equipment, loans, fines, reservations, auditLogs] = await Promise.all(
      [
        this.deps.repository.listEquipment(),
        this.deps.repository.listLoans(),
        this.deps.repository.listFines(),
        this.deps.repository.listReservations(),
        this.deps.repository.listAuditLogs(15),
      ]
    );

    const now = Date.now();
    const activeLoans = loans.filter((l) => l.status !== "Returned");
    const overdueLoans = activeLoans.filter(
      (l) =>
        l.status === "Overdue" ||
        (l.dueAt !== null && new Date(l.dueAt).getTime() < now)
    );
    const lowStockItems = equipment.filter(
      (e) => e.availableStock <= e.minStockAlert
    );
    const totalFinesAmount = fines.reduce((acc, f) => acc + f.amount, 0);
    const pendingFinesAmount = fines
      .filter((f) => f.status === "Pending")
      .reduce((acc, f) => acc + f.amount, 0);
    const upcomingReservationsCount = reservations.filter(
      (r) => r.status === "Confirmed" && new Date(r.endTime).getTime() >= now
    ).length;

    const categories: EquipmentCategory[] = [
      "Consumable",
      "ReturnableComponent",
      "HighValueInstrument",
    ];
    const categoryBreakdown = categories.map((category) => {
      const items = equipment.filter((e) => e.category === category);
      return {
        category,
        count: items.length,
        available: items.reduce((sum, i) => sum + i.availableStock, 0),
      };
    });

    return {
      totalEquipmentCount: equipment.length,
      totalUnitsAvailable: equipment.reduce(
        (sum, e) => sum + e.availableStock,
        0
      ),
      activeLoansCount: activeLoans.length,
      overdueLoansCount: overdueLoans.length,
      lowStockItemsCount: lowStockItems.length,
      totalFinesAmount: Math.round(totalFinesAmount * 100) / 100,
      pendingFinesAmount: Math.round(pendingFinesAmount * 100) / 100,
      upcomingReservationsCount,
      lowStockItems,
      recentAuditLogs: auditLogs,
      categoryBreakdown,
    };
  }
}

const MEMORY_SEED_VERSION = "v2-ruet-bdt";

const globalForLab = globalThis as unknown as {
  labRepository?: LabRepository;
  labRepoVersion?: string;
  labNotifier?: ConsoleNotificationDispatcher;
};

export function getLabRepository(): LabRepository {
  if (
    !globalForLab.labRepository ||
    globalForLab.labRepoVersion !== MEMORY_SEED_VERSION
  ) {
    globalForLab.labRepository =
      process.env.USE_MEMORY_DB === "true"
        ? new MemoryLabRepository()
        : new PrismaLabRepository();
    globalForLab.labRepoVersion = MEMORY_SEED_VERSION;
  }
  return globalForLab.labRepository;
}

export function getLabNotifier(): ConsoleNotificationDispatcher {
  if (!globalForLab.labNotifier) {
    globalForLab.labNotifier = new ConsoleNotificationDispatcher();
  }
  return globalForLab.labNotifier;
}

export function getLabService(): LabService {
  return new LabService({
    repository: getLabRepository(),
    studentVerifier: new UniversityStudentVerifier(),
    notifier: getLabNotifier(),
  });
}
