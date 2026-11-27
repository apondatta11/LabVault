import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getLabRepository } from "@/lib/services/lab-service";

const patchReservationSchema = z.object({
  status: z.enum(["Confirmed", "Completed", "Cancelled"]),
});

/**
 * @openapi
 * /api/reservations/{id}:
 *   patch:
 *     tags: [Reservations]
 *     summary: Update reservation status (Complete or Cancel)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Reservation updated
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = patchReservationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid status", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const reservation = await getLabRepository().updateReservationStatus(
      id,
      parsed.data.status
    );
    return NextResponse.json({ reservation });
  } catch {
    return NextResponse.json(
      { error: "Failed to update reservation" },
      { status: 500 }
    );
  }
}
