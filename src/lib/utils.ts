export { cn } from "cn";

const EVENT_TYPE_LABELS: Record<string, string> = {
  EQUIPMENT_CHECKOUT: "Equipment Checkout",
  EQUIPMENT_RETURNED: "Equipment Returned",
  EQUIPMENT_CREATED: "Equipment Created",
  LOW_STOCK_ALERT: "Low Stock Alert",
  STOCK_DROPPED: "Stock Dropped",
  RESERVATION_CREATED: "Reservation Created",
  FINE_ASSESSED: "Fine Assessed",
  FINE_SETTLED: "Fine Settled",
};

export function formatEventType(eventType: string): string {
  if (EVENT_TYPE_LABELS[eventType]) {
    return EVENT_TYPE_LABELS[eventType];
  }
  return eventType
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const CATEGORY_LABELS: Record<string, string> = {
  Consumable: "Consumable",
  ReturnableComponent: "Returnable Component",
  HighValueInstrument: "High-Value Instrument",
};

export function formatCategory(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

const CONDITION_LABELS: Record<string, string> = {
  Good: "Good",
  MinorDamage: "Minor Damage",
  Broken: "Broken",
  Lost: "Lost",
};

export function formatCondition(condition: string): string {
  return CONDITION_LABELS[condition] ?? condition;
}

const POLICY_LABELS: Record<string, string> = {
  standard: "Standard Late Fee",
  damaged: "Damaged Item Fine",
  grace: "Academic Grace Period",
  StandardLateFeeStrategy: "Standard Late Fee",
  DamagedItemFineStrategy: "Damaged Item Fine",
  AcademicGracePeriodStrategy: "Academic Grace Period",
};

export function formatPolicy(policy: string): string {
  return POLICY_LABELS[policy] ?? policy;
}

export function formatBDT(amount: number): string {
  const formatted = Number.isInteger(amount)
    ? amount.toLocaleString("en-US")
    : amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
  return `৳${formatted}`;
}
export const LAB_CURRENCY_SYMBOL = "৳";