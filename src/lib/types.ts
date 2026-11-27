export type EquipmentCategory =
  | "Consumable"
  | "ReturnableComponent"
  | "HighValueInstrument";

export type LoanStatus = "Active" | "Returned" | "Overdue";

export type ConditionGrade = "Good" | "MinorDamage" | "Broken" | "Lost";

export type FineStatus = "Pending" | "Settled" | "Waived";

export type ReservationStatus = "Confirmed" | "Completed" | "Cancelled";

export interface EquipmentDTO {
  id: string;
  name: string;
  sku: string;
  serialNumber: string | null;
  category: EquipmentCategory;
  description: string;
  totalStock: number;
  availableStock: number;
  minStockAlert: number;
  replacementCost: number;
  location: string;
  createdAt: string;
  updatedAt: string;
}

export interface FineDTO {
  id: string;
  loanId: string;
  studentId: string;
  amount: number;
  reason: string;
  strategyUsed: string;
  condition: ConditionGrade;
  daysLate: number;
  status: FineStatus;
  createdAt: string;
  settledAt: string | null;
}

export interface LoanDTO {
  id: string;
  equipmentId: string;
  equipmentName?: string;
  equipmentSku?: string;
  equipmentCategory?: EquipmentCategory;
  studentId: string;
  studentName: string;
  studentEmail: string;
  quantity: number;
  borrowedAt: string;
  dueAt: string | null;
  returnedAt: string | null;
  status: LoanStatus;
  conditionOnReturn: ConditionGrade | null;
  notes: string | null;
  requiresReturn: boolean;
  fine?: FineDTO | null;
}

export interface ReservationDTO {
  id: string;
  equipmentId: string | null;
  equipmentName?: string | null;
  workbench: string;
  studentId: string;
  studentName: string;
  purpose: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  createdAt: string;
}

export interface AuditLogDTO {
  id: string;
  eventType: string;
  actor: string;
  targetId: string | null;
  targetName: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface DashboardAnalyticsDTO {
  totalEquipmentCount: number;
  totalUnitsAvailable: number;
  activeLoansCount: number;
  overdueLoansCount: number;
  lowStockItemsCount: number;
  totalFinesAmount: number;
  pendingFinesAmount: number;
  upcomingReservationsCount: number;
  lowStockItems: EquipmentDTO[];
  recentAuditLogs: AuditLogDTO[];
  categoryBreakdown: {
    category: EquipmentCategory;
    count: number;
    available: number;
  }[];
}
