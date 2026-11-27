import { PrismaClient, EquipmentCategory, LoanStatus, ConditionGrade, FineStatus, ReservationStatus } from "@prisma/client";

const prisma = new PrismaClient();

export const SEED_EQUIPMENT = [
  {
    name: "STM32 Nucleo-F446RE",
    sku: "MCU-STM32-F446",
    serialNumber: "SN-STM-2026-01",
    category: EquipmentCategory.ReturnableComponent,
    description: "ARM Cortex-M4 180MHz development board with ST-LINK/V2-1 debugger.",
    totalStock: 12,
    availableStock: 9,
    minStockAlert: 4,
    replacementCost: 1850,
    location: "Rack A1 - Embedded Systems",
  },
  {
    name: "Arduino Uno R3",
    sku: "MCU-ARD-UNO-R3",
    serialNumber: "SN-ARD-2026-01",
    category: EquipmentCategory.ReturnableComponent,
    description: "ATmega328P microcontroller board with USB-B interface for rapid prototyping.",
    totalStock: 20,
    availableStock: 16,
    minStockAlert: 5,
    replacementCost: 1200,
    location: "Rack A2 - Microcontrollers",
  },
  {
    name: "ESP32-WROOM-32 DevKit",
    sku: "IOT-ESP32-DEV",
    serialNumber: "SN-ESP-2026-01",
    category: EquipmentCategory.ReturnableComponent,
    description: "Dual-core Wi-Fi & Bluetooth Low Energy SoC development board.",
    totalStock: 15,
    availableStock: 2,
    minStockAlert: 4,
    replacementCost: 650,
    location: "Rack A3 - IoT & Wireless",
  },
  {
    name: "HC-SR04 Ultrasonic Sensor",
    sku: "SNS-HCSR04",
    serialNumber: null,
    category: EquipmentCategory.ReturnableComponent,
    description: "2cm–400cm non-contact ultrasonic ranging module (5V TTL).",
    totalStock: 25,
    availableStock: 21,
    minStockAlert: 6,
    replacementCost: 220,
    location: "Bin B2 - Sensors",
  },
  {
    name: "Rigol DS1054Z Digital Oscilloscope",
    sku: "INS-RIGOL-1054Z",
    serialNumber: "DS1ZA240900412",
    category: EquipmentCategory.HighValueInstrument,
    description: "4-channel 50MHz (upgradable) 1GSa/s digital storage oscilloscope.",
    totalStock: 4,
    availableStock: 3,
    minStockAlert: 1,
    replacementCost: 45000,
    location: "Bench 01 - High Voltage & Signal",
  },
  {
    name: "Saleae Logic Pro 8 Logic Analyzer",
    sku: "INS-SALEAE-PRO8",
    serialNumber: "SL-PRO8-88421",
    category: EquipmentCategory.HighValueInstrument,
    description: "8-channel USB 3.0 digital & analog logic analyzer (500MS/s).",
    totalStock: 3,
    availableStock: 2,
    minStockAlert: 1,
    replacementCost: 55000,
    location: "Bench 02 - Digital Debug",
  },
  {
    name: "MB-102 Solderless Breadboard (830-pt)",
    sku: "CON-BB-830",
    serialNumber: null,
    category: EquipmentCategory.Consumable,
    description: "830 tie-point solderless prototyping breadboard with power rails.",
    totalStock: 40,
    availableStock: 28,
    minStockAlert: 10,
    replacementCost: 180,
    location: "Drawer C1 - Prototyping",
  },
  {
    name: "Jumper Wires Pack (M-M / M-F 40-pin)",
    sku: "CON-JMP-40P",
    serialNumber: null,
    category: EquipmentCategory.Consumable,
    description: "20cm 40-pin ribbon jumper wire bundle for breadboard interconnects.",
    totalStock: 50,
    availableStock: 7,
    minStockAlert: 10,
    replacementCost: 120,
    location: "Drawer C2 - Interconnects",
  },
];

async function main() {
  console.log("Seeding LabVault database...");

  await prisma.auditLog.deleteMany();
  await prisma.fine.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.equipment.deleteMany();

  const createdEquipment = [];
  for (const item of SEED_EQUIPMENT) {
    const eq = await prisma.equipment.create({ data: item });
    createdEquipment.push(eq);
  }

  const stm32 = createdEquipment[0];
  const esp32 = createdEquipment[2];
  const scope = createdEquipment[4];
  const breadboard = createdEquipment[6];

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const fourDaysFromNow = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

  // Active on-time loan
  await prisma.loan.create({
    data: {
      equipmentId: stm32.id,
      studentId: "2103097",
      studentName: "Rafiqul Islam",
      studentEmail: "2103097@student.ruet.ac.bd",
      quantity: 2,
      borrowedAt: threeDaysAgo,
      dueAt: fourDaysFromNow,
      status: LoanStatus.Active,
      requiresReturn: true,
      notes: "Hardware Lab Embedded Timer Project",
    },
  });

  // Overdue loan
  await prisma.loan.create({
    data: {
      equipmentId: esp32.id,
      studentId: "2203125",
      studentName: "Tasnim Akter",
      studentEmail: "2203125@student.ruet.ac.bd",
      quantity: 3,
      borrowedAt: tenDaysAgo,
      dueAt: threeDaysAgo,
      status: LoanStatus.Overdue,
      requiresReturn: true,
      notes: "MQTT Telemetry Sensor Node",
    },
  });

  // Returned loan with minor damage fine
  const damagedLoan = await prisma.loan.create({
    data: {
      equipmentId: stm32.id,
      studentId: "2303044",
      studentName: "Mehedi Hasan",
      studentEmail: "2303044@student.ruet.ac.bd",
      quantity: 1,
      borrowedAt: tenDaysAgo,
      dueAt: threeDaysAgo,
      returnedAt: now,
      status: LoanStatus.Returned,
      conditionOnReturn: ConditionGrade.MinorDamage,
      requiresReturn: true,
      notes: "Bent header pin on CN10",
    },
  });

  await prisma.fine.create({
    data: {
      loanId: damagedLoan.id,
      studentId: "2303044",
      amount: 612.5,
      reason: "3 day(s) late (৳150) + Minor Damage repair fee (25% of ৳1,850)",
      strategyUsed: "DamagedItemFineStrategy",
      condition: ConditionGrade.MinorDamage,
      daysLate: 3,
      status: FineStatus.Pending,
    },
  });

  // Consumable checkout (no return required)
  await prisma.loan.create({
    data: {
      equipmentId: breadboard.id,
      studentId: "2503033",
      studentName: "Nusrat Jahan",
      studentEmail: "2503033@student.ruet.ac.bd",
      quantity: 2,
      borrowedAt: threeDaysAgo,
      dueAt: null,
      returnedAt: threeDaysAgo,
      status: LoanStatus.Returned,
      conditionOnReturn: ConditionGrade.Good,
      requiresReturn: false,
      notes: "Issued as consumable for lab group 4",
    },
  });

  // Lab Slot Reservations
  const tomorrowMorning = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0);
  const tomorrowMidday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 11, 0, 0);
  const tomorrowAfternoon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 14, 0, 0);
  const tomorrowEvening = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 16, 0, 0);

  await prisma.reservation.create({
    data: {
      equipmentId: scope.id,
      workbench: "Bench 01 - High Voltage & Signal",
      studentId: "2103097",
      studentName: "Rafiqul Islam",
      purpose: "PWM & UART waveform verification",
      startTime: tomorrowMorning,
      endTime: tomorrowMidday,
      status: ReservationStatus.Confirmed,
    },
  });

  await prisma.reservation.create({
    data: {
      equipmentId: scope.id,
      workbench: "Bench 01 - High Voltage & Signal",
      studentId: "2103075",
      studentName: "Farhan Ahmed",
      purpose: "SPI clock jitter measurement",
      startTime: tomorrowAfternoon,
      endTime: tomorrowEvening,
      status: ReservationStatus.Confirmed,
    },
  });

  // Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        eventType: "EQUIPMENT_CHECKOUT",
        actor: "2103097",
        targetId: stm32.id,
        targetName: stm32.name,
        summary: "Checked out 2x STM32 Nucleo-F446RE (Due in 7 days)",
        metadata: { quantity: 2, studentName: "Rafiqul Islam" },
      },
      {
        eventType: "LOW_STOCK_ALERT",
        actor: "SYSTEM",
        targetId: esp32.id,
        targetName: esp32.name,
        summary: "Low stock alert: ESP32-WROOM-32 DevKit has 2 left (threshold: 4)",
        metadata: { availableStock: 2, minStockAlert: 4 },
      },
      {
        eventType: "FINE_ASSESSED",
        actor: "LAB_OFFICER",
        targetId: damagedLoan.id,
        targetName: stm32.name,
        summary: "Assessed ৳612.50 fine on 2303044 via Damaged Item Fine",
        metadata: { amount: 612.5, condition: "MinorDamage" },
      },
    ],
  });

  console.log("Seeded 8 hardware items, 4 loans, 1 fine, 2 reservations, and 3 audit logs.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
