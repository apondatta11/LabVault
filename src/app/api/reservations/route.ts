import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getLabRepository,
  getLabService,
  LabServiceError,
} from "@/lib/services/lab-service";

const reservationSchema = z.object({
  equipmentId: z.string().nullable().optional(),
  workbench: z.string().min(2).max(120),
  studentId: z.string().min(4).max(20),
  studentName: z.string().min(2).max(100),
  purpose: z.string().min(3).max(240),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

/**
 * @openapi
 * /api/reservations:
 *   get:
 *     tags: [Reservations]
 *     summary: List lab workbench and high-value instrument reservations
 *     responses:
 *       200:
 *         description: List of reservations
 *   post:
 *     tags: [Reservations]
 *     summary: Create a lab slot reservation with overlap conflict prevention
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateReservationInput'
 *     responses:
 *       201:
 *         description: Reservation confirmed
 *       409:
 *         description: Overlapping slot conflict
 */
export async function GET() {
  try {
    const reservations = await getLabRepository().listReservations();
    return NextResponse.json({ reservations });
  } catch (error) {
    console.error("GET /api/reservations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = reservationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid reservation payload",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const reservation = await getLabService().createReservation({
      equipmentId: parsed.data.equipmentId ?? null,
      workbench: parsed.data.workbench,
      studentId: parsed.data.studentId,
      studentName: parsed.data.studentName,
      purpose: parsed.data.purpose,
      startTime: new Date(parsed.data.startTime),
      endTime: new Date(parsed.data.endTime),
    });

    return NextResponse.json({ reservation }, { status: 201 });
  } catch (error) {
    if (error instanceof LabServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("POST /api/reservations error:", error);
    return NextResponse.json(
      { error: "Failed to create reservation" },
      { status: 500 }
    );
  }
}
