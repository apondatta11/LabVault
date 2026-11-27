import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getLabService, LabServiceError } from "@/lib/services/lab-service";

const returnSchema = z.object({
  condition: z.enum(["Good", "MinorDamage", "Broken", "Lost"]),
  policy: z.enum(["standard", "damaged", "grace"]).optional().default("standard"),
  daysLateOverride: z.coerce.number().int().min(0).optional(),
});

/**
 * @openapi
 * /api/loans/{id}/return:
 *   post:
 *     tags: [Loans]
 *     summary: Confirm hardware return, inspect condition, and compute fine
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReturnInput'
 *     responses:
 *       200:
 *         description: Loan marked returned with optional fine assessment
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = returnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid return payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const returnedAt =
      parsed.data.daysLateOverride !== undefined
        ? new Date(
            Date.now() + parsed.data.daysLateOverride * 24 * 60 * 60 * 1000
          )
        : undefined;

    const result = await getLabService().returnEquipment({
      loanId: id,
      condition: parsed.data.condition,
      policy: parsed.data.policy,
      returnedAt,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof LabServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("POST /api/loans/[id]/return error:", error);
    return NextResponse.json(
      { error: "Failed to process return" },
      { status: 500 }
    );
  }
}
