import { prisma } from "@/lib/prisma";
import type {
  AuditLogDTO,
  ConditionGrade,
  EquipmentCategory,
  EquipmentDTO,
  FineDTO,
  FineStatus,
  LoanDTO,
  LoanStatus,
  ReservationDTO,
  ReservationStatus,
} from "@/lib/types";

export interface CreateEquipmentInput {
  name: string;
  sku: string;
  serialNumber?: string | null;
  category: EquipmentCategory;
  description: string;
  totalStock: number;
  availableStock: number;
  minStockAlert: number;
  replacementCost: number;
  location: string;
}

export interface UpdateEquipmentInput {
  name?: string;
  sku?: string;
  serialNumber?: string | null;
  category?: EquipmentCategory;
  description?: string;
  totalStock?: number;
  availableStock?: number;
  minStockAlert?: number;
  replacementCost?: number;
  location?: string;
}

export interface CreateLoanInput {
  equipmentId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  quantity: number;
  dueAt: Date | null;
  requiresReturn: boolean;
  notes?: string | null;
  status: LoanStatus;
  returnedAt?: Date | null;
  conditionOnReturn?: ConditionGrade | null;
}

export interface CreateFineInput {
  loanId: string;
  studentId: string;
  amount: number;
  reason: string;
  strategyUsed: string;
  condition: ConditionGrade;
  daysLate: number;
}

export interface CreateReservationInput {
  equipmentId: string | null;
  workbench: string;
  studentId: string;
  studentName: string;
  purpose: string;
  startTime: Date;
  endTime: Date;
}

export interface CreateAuditLogInput {
  eventType: string;
  actor: string;
  targetId?: string;
  targetName?: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

export interface LabRepository {
  listEquipment(filters?: {
    search?: string;
    category?: EquipmentCategory | "ALL";
  }): Promise<EquipmentDTO[]>;
  getEquipmentById(id: string): Promise<EquipmentDTO | null>;
  getEquipmentBySku(sku: string): Promise<EquipmentDTO | null>;
  createEquipment(data: CreateEquipmentInput): Promise<EquipmentDTO>;
  updateEquipment(id: string, data: UpdateEquipmentInput): Promise<EquipmentDTO>;
  deleteEquipment(id: string): Promise<void>;

  listLoans(status?: LoanStatus | "ALL"): Promise<LoanDTO[]>;
  getLoanById(id: string): Promise<LoanDTO | null>;
  createLoan(data: CreateLoanInput): Promise<LoanDTO>;
  markLoanReturned(
    id: string,
    condition: ConditionGrade,
    returnedAt: Date
  ): Promise<LoanDTO>;

  listFines(status?: FineStatus | "ALL"): Promise<FineDTO[]>;
  getFineById(id: string): Promise<FineDTO | null>;
  createFine(data: CreateFineInput): Promise<FineDTO>;
  updateFineStatus(id: string, status: FineStatus): Promise<FineDTO>;

  listReservations(): Promise<ReservationDTO[]>;
  findOverlappingReservation(
    workbench: string,
    startTime: Date,
    endTime: Date
  ): Promise<ReservationDTO | null>;
  hasConfirmedReservationForEquipment(
    equipmentId: string,
    studentId: string,
    atTime: Date
  ): Promise<boolean>;
  createReservation(data: CreateReservationInput): Promise<ReservationDTO>;
  updateReservationStatus(
    id: string,
    status: ReservationStatus
  ): Promise<ReservationDTO>;

  listAuditLogs(limit?: number): Promise<AuditLogDTO[]>;
  createAuditLog(data: CreateAuditLogInput): Promise<AuditLogDTO>;
}

const toIso = (d: Date | string | null | undefined): string | null =>
  d ? (d instanceof Date ? d.toISOString() : d) : null;

export class PrismaLabRepository implements LabRepository {
  async listEquipment(filters?: {
    search?: string;
    category?: EquipmentCategory | "ALL";
  }): Promise<EquipmentDTO[]> {
    const search = filters?.search?.trim();
    const category =
      filters?.category && filters.category !== "ALL"
        ? filters.category
        : undefined;

    const rows = await prisma.equipment.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { sku: { contains: search, mode: "insensitive" } },
                { location: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
    });

    return rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async getEquipmentById(id: string): Promise<EquipmentDTO | null> {
    const row = await prisma.equipment.findUnique({ where: { id } });
    if (!row) return null;
    return {
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async getEquipmentBySku(sku: string): Promise<EquipmentDTO | null> {
    const row = await prisma.equipment.findUnique({ where: { sku } });
    if (!row) return null;
    return {
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async createEquipment(data: CreateEquipmentInput): Promise<EquipmentDTO> {
    const row = await prisma.equipment.create({ data });
    return {
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async updateEquipment(
    id: string,
    data: UpdateEquipmentInput
  ): Promise<EquipmentDTO> {
    const row = await prisma.equipment.update({ where: { id }, data });
    return {
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async deleteEquipment(id: string): Promise<void> {
    await prisma.equipment.delete({ where: { id } });
  }

  async listLoans(status?: LoanStatus | "ALL"): Promise<LoanDTO[]> {
    const rows = await prisma.loan.findMany({
      where: status && status !== "ALL" ? { status } : undefined,
      include: { equipment: true, fine: true },
      orderBy: { borrowedAt: "desc" },
    });

    return rows.map((r) => ({
      id: r.id,
      equipmentId: r.equipmentId,
      equipmentName: r.equipment.name,
      equipmentSku: r.equipment.sku,
      equipmentCategory: r.equipment.category,
      studentId: r.studentId,
      studentName: r.studentName,
      studentEmail: r.studentEmail,
      quantity: r.quantity,
      borrowedAt: r.borrowedAt.toISOString(),
      dueAt: toIso(r.dueAt),
      returnedAt: toIso(r.returnedAt),
      status: r.status,
      conditionOnReturn: r.conditionOnReturn,
      notes: r.notes,
      requiresReturn: r.requiresReturn,
      fine: r.fine
        ? {
            ...r.fine,
            createdAt: r.fine.createdAt.toISOString(),
            settledAt: toIso(r.fine.settledAt),
          }
        : null,
    }));
  }

  async getLoanById(id: string): Promise<LoanDTO | null> {
    const r = await prisma.loan.findUnique({
      where: { id },
      include: { equipment: true, fine: true },
    });
    if (!r) return null;
    return {
      id: r.id,
      equipmentId: r.equipmentId,
      equipmentName: r.equipment.name,
      equipmentSku: r.equipment.sku,
      equipmentCategory: r.equipment.category,
      studentId: r.studentId,
      studentName: r.studentName,
      studentEmail: r.studentEmail,
      quantity: r.quantity,
      borrowedAt: r.borrowedAt.toISOString(),
      dueAt: toIso(r.dueAt),
      returnedAt: toIso(r.returnedAt),
      status: r.status,
      conditionOnReturn: r.conditionOnReturn,
      notes: r.notes,
      requiresReturn: r.requiresReturn,
      fine: r.fine
        ? {
            ...r.fine,
            createdAt: r.fine.createdAt.toISOString(),
            settledAt: toIso(r.fine.settledAt),
          }
        : null,
    };
  }

  async createLoan(data: CreateLoanInput): Promise<LoanDTO> {
    const r = await prisma.loan.create({
      data,
      include: { equipment: true, fine: true },
    });
    return {
      id: r.id,
      equipmentId: r.equipmentId,
      equipmentName: r.equipment.name,
      equipmentSku: r.equipment.sku,
      equipmentCategory: r.equipment.category,
      studentId: r.studentId,
      studentName: r.studentName,
      studentEmail: r.studentEmail,
      quantity: r.quantity,
      borrowedAt: r.borrowedAt.toISOString(),
      dueAt: toIso(r.dueAt),
      returnedAt: toIso(r.returnedAt),
      status: r.status,
      conditionOnReturn: r.conditionOnReturn,
      notes: r.notes,
      requiresReturn: r.requiresReturn,
      fine: null,
    };
  }

  async markLoanReturned(
    id: string,
    condition: ConditionGrade,
    returnedAt: Date
  ): Promise<LoanDTO> {
    const r = await prisma.loan.update({
      where: { id },
      data: {
        status: "Returned",
        conditionOnReturn: condition,
        returnedAt,
      },
      include: { equipment: true, fine: true },
    });
    return {
      id: r.id,
      equipmentId: r.equipmentId,
      equipmentName: r.equipment.name,
      equipmentSku: r.equipment.sku,
      equipmentCategory: r.equipment.category,
      studentId: r.studentId,
      studentName: r.studentName,
      studentEmail: r.studentEmail,
      quantity: r.quantity,
      borrowedAt: r.borrowedAt.toISOString(),
      dueAt: toIso(r.dueAt),
      returnedAt: toIso(r.returnedAt),
      status: r.status,
      conditionOnReturn: r.conditionOnReturn,
      notes: r.notes,
      requiresReturn: r.requiresReturn,
      fine: r.fine
        ? {
            ...r.fine,
            createdAt: r.fine.createdAt.toISOString(),
            settledAt: toIso(r.fine.settledAt),
          }
        : null,
    };
  }

  async listFines(status?: FineStatus | "ALL"): Promise<FineDTO[]> {
    const rows = await prisma.fine.findMany({
      where: status && status !== "ALL" ? { status } : undefined,
      orderBy: { createdAt: "desc" },
    });
    return rows.map((f) => ({
      ...f,
      createdAt: f.createdAt.toISOString(),
      settledAt: toIso(f.settledAt),
    }));
  }

  async getFineById(id: string): Promise<FineDTO | null> {
    const f = await prisma.fine.findUnique({ where: { id } });
    if (!f) return null;
    return {
      ...f,
      createdAt: f.createdAt.toISOString(),
      settledAt: toIso(f.settledAt),
    };
  }

  async createFine(data: CreateFineInput): Promise<FineDTO> {
    const f = await prisma.fine.create({ data });
    return {
      ...f,
      createdAt: f.createdAt.toISOString(),
      settledAt: toIso(f.settledAt),
    };
  }

  async updateFineStatus(id: string, status: FineStatus): Promise<FineDTO> {
    const f = await prisma.fine.update({
      where: { id },
      data: {
        status,
        settledAt: status === "Settled" || status === "Waived" ? new Date() : null,
      },
    });
    return {
      ...f,
      createdAt: f.createdAt.toISOString(),
      settledAt: toIso(f.settledAt),
    };
  }

  async listReservations(): Promise<ReservationDTO[]> {
    const rows = await prisma.reservation.findMany({
      include: { equipment: true },
      orderBy: { startTime: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      equipmentId: r.equipmentId,
      equipmentName: r.equipment?.name ?? null,
      workbench: r.workbench,
      studentId: r.studentId,
      studentName: r.studentName,
      purpose: r.purpose,
      startTime: r.startTime.toISOString(),
      endTime: r.endTime.toISOString(),
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async findOverlappingReservation(
    workbench: string,
    startTime: Date,
    endTime: Date
  ): Promise<ReservationDTO | null> {
    const r = await prisma.reservation.findFirst({
      where: {
        workbench,
        status: "Confirmed",
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      include: { equipment: true },
    });
    if (!r) return null;
    return {
      id: r.id,
      equipmentId: r.equipmentId,
      equipmentName: r.equipment?.name ?? null,
      workbench: r.workbench,
      studentId: r.studentId,
      studentName: r.studentName,
      purpose: r.purpose,
      startTime: r.startTime.toISOString(),
      endTime: r.endTime.toISOString(),
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    };
  }

  async hasConfirmedReservationForEquipment(
    equipmentId: string,
    studentId: string,
    atTime: Date
  ): Promise<boolean> {
    const count = await prisma.reservation.count({
      where: {
        equipmentId,
        studentId,
        status: "Confirmed",
        endTime: { gte: atTime },
      },
    });
    return count > 0;
  }

  async createReservation(
    data: CreateReservationInput
  ): Promise<ReservationDTO> {
    const r = await prisma.reservation.create({
      data,
      include: { equipment: true },
    });
    return {
      id: r.id,
      equipmentId: r.equipmentId,
      equipmentName: r.equipment?.name ?? null,
      workbench: r.workbench,
      studentId: r.studentId,
      studentName: r.studentName,
      purpose: r.purpose,
      startTime: r.startTime.toISOString(),
      endTime: r.endTime.toISOString(),
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    };
  }

  async updateReservationStatus(
    id: string,
    status: ReservationStatus
  ): Promise<ReservationDTO> {
    const r = await prisma.reservation.update({
      where: { id },
      data: { status },
      include: { equipment: true },
    });
    return {
      id: r.id,
      equipmentId: r.equipmentId,
      equipmentName: r.equipment?.name ?? null,
      workbench: r.workbench,
      studentId: r.studentId,
      studentName: r.studentName,
      purpose: r.purpose,
      startTime: r.startTime.toISOString(),
      endTime: r.endTime.toISOString(),
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    };
  }

  async listAuditLogs(limit = 50): Promise<AuditLogDTO[]> {
    const rows = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((l) => ({
      id: l.id,
      eventType: l.eventType,
      actor: l.actor,
      targetId: l.targetId,
      targetName: l.targetName,
      summary: l.summary,
      metadata: (l.metadata as Record<string, unknown> | null) ?? null,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  async createAuditLog(data: CreateAuditLogInput): Promise<AuditLogDTO> {
    const l = await prisma.auditLog.create({
      data: {
        eventType: data.eventType,
        actor: data.actor,
        targetId: data.targetId,
        targetName: data.targetName,
        summary: data.summary,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
      },
    });
    return {
      id: l.id,
      eventType: l.eventType,
      actor: l.actor,
      targetId: l.targetId,
      targetName: l.targetName,
      summary: l.summary,
      metadata: (l.metadata as Record<string, unknown> | null) ?? null,
      createdAt: l.createdAt.toISOString(),
    };
  }
}

/**
 * In-memory repository for local development & Selenium E2E when PostgreSQL is not running.
 */
export class MemoryLabRepository implements LabRepository {
  private equipment: EquipmentDTO[] = [];
  private loans: LoanDTO[] = [];
  private fines: FineDTO[] = [];
  private reservations: ReservationDTO[] = [];
  private auditLogs: AuditLogDTO[] = [];
  private seq = 1;

  constructor() {
    this.seedInitialData();
  }

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}_${this.seq}`;
  }

  private seedInitialData(): void {
    const now = new Date();
    const isoNow = now.toISOString();
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400000).toISOString();
    const tenDaysAgo = new Date(now.getTime() - 10 * 86400000).toISOString();
    const fourDaysAhead = new Date(now.getTime() + 4 * 86400000).toISOString();

    this.equipment = [
      {
        id: "eq_stm32",
        name: "STM32 Nucleo-F446RE",
        sku: "MCU-STM32-F446",
        serialNumber: "SN-STM-2026-01",
        category: "ReturnableComponent",
        description: "ARM Cortex-M4 180MHz development board with ST-LINK/V2-1 debugger.",
        totalStock: 12,
        availableStock: 9,
        minStockAlert: 4,
        replacementCost: 1850,
        location: "Rack A1 - Embedded Systems",
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "eq_arduino",
        name: "Arduino Uno R3",
        sku: "MCU-ARD-UNO-R3",
        serialNumber: "SN-ARD-2026-01",
        category: "ReturnableComponent",
        description: "ATmega328P microcontroller board with USB-B interface for rapid prototyping.",
        totalStock: 20,
        availableStock: 16,
        minStockAlert: 5,
        replacementCost: 1200,
        location: "Rack A2 - Microcontrollers",
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "eq_esp32",
        name: "ESP32-WROOM-32 DevKit",
        sku: "IOT-ESP32-DEV",
        serialNumber: "SN-ESP-2026-01",
        category: "ReturnableComponent",
        description: "Dual-core Wi-Fi & Bluetooth Low Energy SoC development board.",
        totalStock: 15,
        availableStock: 2,
        minStockAlert: 4,
        replacementCost: 650,
        location: "Rack A3 - IoT & Wireless",
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "eq_hcsr04",
        name: "HC-SR04 Ultrasonic Sensor",
        sku: "SNS-HCSR04",
        serialNumber: null,
        category: "ReturnableComponent",
        description: "2cm–400cm non-contact ultrasonic ranging module (5V TTL).",
        totalStock: 25,
        availableStock: 21,
        minStockAlert: 6,
        replacementCost: 220,
        location: "Bin B2 - Sensors",
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "eq_rigol",
        name: "Rigol DS1054Z Digital Oscilloscope",
        sku: "INS-RIGOL-1054Z",
        serialNumber: "DS1ZA240900412",
        category: "HighValueInstrument",
        description: "4-channel 50MHz 1GSa/s digital storage oscilloscope.",
        totalStock: 4,
        availableStock: 3,
        minStockAlert: 1,
        replacementCost: 45000,
        location: "Bench 01 - High Voltage & Signal",
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "eq_saleae",
        name: "Saleae Logic Pro 8 Logic Analyzer",
        sku: "INS-SALEAE-PRO8",
        serialNumber: "SL-PRO8-88421",
        category: "HighValueInstrument",
        description: "8-channel USB 3.0 digital & analog logic analyzer (500MS/s).",
        totalStock: 3,
        availableStock: 2,
        minStockAlert: 1,
        replacementCost: 55000,
        location: "Bench 02 - Digital Debug",
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "eq_breadboard",
        name: "MB-102 Solderless Breadboard (830-pt)",
        sku: "CON-BB-830",
        serialNumber: null,
        category: "Consumable",
        description: "830 tie-point solderless prototyping breadboard with power rails.",
        totalStock: 40,
        availableStock: 28,
        minStockAlert: 10,
        replacementCost: 180,
        location: "Drawer C1 - Prototyping",
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "eq_jumper",
        name: "Jumper Wires Pack (M-M / M-F 40-pin)",
        sku: "CON-JMP-40P",
        serialNumber: null,
        category: "Consumable",
        description: "20cm 40-pin ribbon jumper wire bundle for breadboard interconnects.",
        totalStock: 50,
        availableStock: 7,
        minStockAlert: 10,
        replacementCost: 120,
        location: "Drawer C2 - Interconnects",
        createdAt: isoNow,
        updatedAt: isoNow,
      },
    ];

    const fine1: FineDTO = {
      id: "fine_1",
      loanId: "loan_3",
      studentId: "2303044",
      amount: 612.5,
      reason: "3 day(s) late (৳150) + Minor Damage repair fee (25% of ৳1,850)",
      strategyUsed: "DamagedItemFineStrategy",
      condition: "MinorDamage",
      daysLate: 3,
      status: "Pending",
      createdAt: isoNow,
      settledAt: null,
    };
    this.fines.push(fine1);

    this.loans = [
      {
        id: "loan_1",
        equipmentId: "eq_stm32",
        equipmentName: "STM32 Nucleo-F446RE",
        equipmentSku: "MCU-STM32-F446",
        equipmentCategory: "ReturnableComponent",
        studentId: "2103097",
        studentName: "Rafiqul Islam",
        studentEmail: "2103097@student.ruet.ac.bd",
        quantity: 2,
        borrowedAt: threeDaysAgo,
        dueAt: fourDaysAhead,
        returnedAt: null,
        status: "Active",
        conditionOnReturn: null,
        notes: "Hardware Lab Embedded Timer Project",
        requiresReturn: true,
        fine: null,
      },
      {
        id: "loan_2",
        equipmentId: "eq_esp32",
        equipmentName: "ESP32-WROOM-32 DevKit",
        equipmentSku: "IOT-ESP32-DEV",
        equipmentCategory: "ReturnableComponent",
        studentId: "2203125",
        studentName: "Tasnim Akter",
        studentEmail: "2203125@student.ruet.ac.bd",
        quantity: 3,
        borrowedAt: tenDaysAgo,
        dueAt: threeDaysAgo,
        returnedAt: null,
        status: "Overdue",
        conditionOnReturn: null,
        notes: "MQTT Telemetry Sensor Node",
        requiresReturn: true,
        fine: null,
      },
      {
        id: "loan_3",
        equipmentId: "eq_stm32",
        equipmentName: "STM32 Nucleo-F446RE",
        equipmentSku: "MCU-STM32-F446",
        equipmentCategory: "ReturnableComponent",
        studentId: "2303044",
        studentName: "Mehedi Hasan",
        studentEmail: "2303044@student.ruet.ac.bd",
        quantity: 1,
        borrowedAt: tenDaysAgo,
        dueAt: threeDaysAgo,
        returnedAt: isoNow,
        status: "Returned",
        conditionOnReturn: "MinorDamage",
        notes: "Bent header pin on CN10",
        requiresReturn: true,
        fine: fine1,
      },
    ];

    const tomorrowMorning = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      9,
      0,
      0
    ).toISOString();
    const tomorrowMidday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      11,
      0,
      0
    ).toISOString();

    this.reservations = [
      {
        id: "res_1",
        equipmentId: "eq_rigol",
        equipmentName: "Rigol DS1054Z Digital Oscilloscope",
        workbench: "Bench 01 - High Voltage & Signal",
        studentId: "2103075",
        studentName: "Farhan Ahmed",
        purpose: "PWM & UART waveform verification",
        startTime: tomorrowMorning,
        endTime: tomorrowMidday,
        status: "Confirmed",
        createdAt: isoNow,
      },
      {
        id: "res_2",
        equipmentId: "eq_saleae",
        equipmentName: "Saleae Logic Pro 8 Logic Analyzer",
        workbench: "Bench 02 - Digital Debug",
        studentId: "2503033",
        studentName: "Nusrat Jahan",
        purpose: "I2C & SPI bus timing capture",
        startTime: tomorrowMorning,
        endTime: tomorrowMidday,
        status: "Confirmed",
        createdAt: isoNow,
      },
    ];

    this.auditLogs = [
      {
        id: "audit_1",
        eventType: "EQUIPMENT_CHECKOUT",
        actor: "2103097",
        targetId: "eq_stm32",
        targetName: "STM32 Nucleo-F446RE",
        summary: "Checked out 2x STM32 Nucleo-F446RE (Due in 7 days)",
        metadata: { quantity: 2 },
        createdAt: threeDaysAgo,
      },
      {
        id: "audit_2",
        eventType: "LOW_STOCK_ALERT",
        actor: "SYSTEM",
        targetId: "eq_esp32",
        targetName: "ESP32-WROOM-32 DevKit",
        summary: "Low stock alert: ESP32-WROOM-32 DevKit has 2 left (threshold: 4)",
        metadata: { availableStock: 2, minStockAlert: 4 },
        createdAt: isoNow,
      },
    ];
  }

  async listEquipment(filters?: {
    search?: string;
    category?: EquipmentCategory | "ALL";
  }): Promise<EquipmentDTO[]> {
    const q = filters?.search?.trim().toLowerCase();
    const cat = filters?.category;
    return this.equipment
      .filter((e) => {
        if (cat && cat !== "ALL" && e.category !== cat) return false;
        if (q) {
          return (
            e.name.toLowerCase().includes(q) ||
            e.sku.toLowerCase().includes(q) ||
            e.location.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getEquipmentById(id: string): Promise<EquipmentDTO | null> {
    return this.equipment.find((e) => e.id === id) ?? null;
  }

  async getEquipmentBySku(sku: string): Promise<EquipmentDTO | null> {
    return this.equipment.find((e) => e.sku === sku) ?? null;
  }

  async createEquipment(data: CreateEquipmentInput): Promise<EquipmentDTO> {
    const now = new Date().toISOString();
    const item: EquipmentDTO = {
      id: this.nextId("eq"),
      name: data.name,
      sku: data.sku,
      serialNumber: data.serialNumber ?? null,
      category: data.category,
      description: data.description,
      totalStock: data.totalStock,
      availableStock: data.availableStock,
      minStockAlert: data.minStockAlert,
      replacementCost: data.replacementCost,
      location: data.location,
      createdAt: now,
      updatedAt: now,
    };
    this.equipment.push(item);
    return item;
  }

  async updateEquipment(
    id: string,
    data: UpdateEquipmentInput
  ): Promise<EquipmentDTO> {
    const idx = this.equipment.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error("Equipment not found");
    this.equipment[idx] = {
      ...this.equipment[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return this.equipment[idx];
  }

  async deleteEquipment(id: string): Promise<void> {
    this.equipment = this.equipment.filter((e) => e.id !== id);
  }

  async listLoans(status?: LoanStatus | "ALL"): Promise<LoanDTO[]> {
    return this.loans
      .filter((l) => (!status || status === "ALL" ? true : l.status === status))
      .map((l) => ({
        ...l,
        fine: this.fines.find((f) => f.loanId === l.id) ?? null,
      }));
  }

  async getLoanById(id: string): Promise<LoanDTO | null> {
    const loan = this.loans.find((l) => l.id === id);
    if (!loan) return null;
    return {
      ...loan,
      fine: this.fines.find((f) => f.loanId === loan.id) ?? null,
    };
  }

  async createLoan(data: CreateLoanInput): Promise<LoanDTO> {
    const eq = await this.getEquipmentById(data.equipmentId);
    const loan: LoanDTO = {
      id: this.nextId("loan"),
      equipmentId: data.equipmentId,
      equipmentName: eq?.name,
      equipmentSku: eq?.sku,
      equipmentCategory: eq?.category,
      studentId: data.studentId,
      studentName: data.studentName,
      studentEmail: data.studentEmail,
      quantity: data.quantity,
      borrowedAt: new Date().toISOString(),
      dueAt: toIso(data.dueAt),
      returnedAt: toIso(data.returnedAt),
      status: data.status,
      conditionOnReturn: data.conditionOnReturn ?? null,
      notes: data.notes ?? null,
      requiresReturn: data.requiresReturn,
      fine: null,
    };
    this.loans.unshift(loan);
    return loan;
  }

  async markLoanReturned(
    id: string,
    condition: ConditionGrade,
    returnedAt: Date
  ): Promise<LoanDTO> {
    const idx = this.loans.findIndex((l) => l.id === id);
    if (idx === -1) throw new Error("Loan not found");
    this.loans[idx] = {
      ...this.loans[idx],
      status: "Returned",
      conditionOnReturn: condition,
      returnedAt: returnedAt.toISOString(),
    };
    return this.loans[idx];
  }

  async listFines(status?: FineStatus | "ALL"): Promise<FineDTO[]> {
    return this.fines.filter((f) =>
      !status || status === "ALL" ? true : f.status === status
    );
  }

  async getFineById(id: string): Promise<FineDTO | null> {
    return this.fines.find((f) => f.id === id) ?? null;
  }

  async createFine(data: CreateFineInput): Promise<FineDTO> {
    const fine: FineDTO = {
      id: this.nextId("fine"),
      loanId: data.loanId,
      studentId: data.studentId,
      amount: data.amount,
      reason: data.reason,
      strategyUsed: data.strategyUsed,
      condition: data.condition,
      daysLate: data.daysLate,
      status: "Pending",
      createdAt: new Date().toISOString(),
      settledAt: null,
    };
    this.fines.unshift(fine);
    return fine;
  }

  async updateFineStatus(id: string, status: FineStatus): Promise<FineDTO> {
    const idx = this.fines.findIndex((f) => f.id === id);
    if (idx === -1) throw new Error("Fine not found");
    this.fines[idx] = {
      ...this.fines[idx],
      status,
      settledAt:
        status === "Settled" || status === "Waived"
          ? new Date().toISOString()
          : null,
    };
    return this.fines[idx];
  }

  async listReservations(): Promise<ReservationDTO[]> {
    return [...this.reservations].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
  }

  async findOverlappingReservation(
    workbench: string,
    startTime: Date,
    endTime: Date
  ): Promise<ReservationDTO | null> {
    return (
      this.reservations.find(
        (r) =>
          r.workbench === workbench &&
          r.status === "Confirmed" &&
          new Date(r.startTime) < endTime &&
          new Date(r.endTime) > startTime
      ) ?? null
    );
  }

  async hasConfirmedReservationForEquipment(
    equipmentId: string,
    studentId: string,
    atTime: Date
  ): Promise<boolean> {
    return this.reservations.some(
      (r) =>
        r.equipmentId === equipmentId &&
        r.studentId === studentId &&
        r.status === "Confirmed" &&
        new Date(r.endTime) >= atTime
    );
  }

  async createReservation(
    data: CreateReservationInput
  ): Promise<ReservationDTO> {
    const eq = data.equipmentId
      ? await this.getEquipmentById(data.equipmentId)
      : null;
    const res: ReservationDTO = {
      id: this.nextId("res"),
      equipmentId: data.equipmentId,
      equipmentName: eq?.name ?? null,
      workbench: data.workbench,
      studentId: data.studentId,
      studentName: data.studentName,
      purpose: data.purpose,
      startTime: data.startTime.toISOString(),
      endTime: data.endTime.toISOString(),
      status: "Confirmed",
      createdAt: new Date().toISOString(),
    };
    this.reservations.push(res);
    return res;
  }

  async updateReservationStatus(
    id: string,
    status: ReservationStatus
  ): Promise<ReservationDTO> {
    const idx = this.reservations.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error("Reservation not found");
    this.reservations[idx] = { ...this.reservations[idx], status };
    return this.reservations[idx];
  }

  async listAuditLogs(limit = 50): Promise<AuditLogDTO[]> {
    return this.auditLogs.slice(0, limit);
  }

  async createAuditLog(data: CreateAuditLogInput): Promise<AuditLogDTO> {
    const entry: AuditLogDTO = {
      id: this.nextId("audit"),
      eventType: data.eventType,
      actor: data.actor,
      targetId: data.targetId ?? null,
      targetName: data.targetName ?? null,
      summary: data.summary,
      metadata: data.metadata ?? null,
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.unshift(entry);
    return entry;
  }
}
