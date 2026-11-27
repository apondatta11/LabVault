import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getLabRepository,
  getLabService,
  LabServiceError,
} from "@/lib/services/lab-service";
import type { LoanStatus } from "@/lib/types";

const checkoutSchema = z.object({
  equipmentId: z.string().min(1),
  studentId: z.string().min(4).max(20),
  studentName: z.string().min(2).max(100),
  studentEmail: z.string().email(),
  quantity: z.coerce.number().int().min(1),
  notes: z.string().max(300).optional(),
});

/**
 * @openapi
 * /api/loans:
 *   get:
 *     tags: [Loans]
 *     summary: List all borrow/return loan records
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ALL, Active, Returned, Overdue]
 *     responses:
 *       200:
 *         description: List of loans
 *   post:
 *     tags: [Loans]
 *     summary: Checkout hardware component for a student
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CheckoutInput'
 *     responses:
 *       201:
 *         description: Loan created and stock updated
 *       400:
 *         description: Validation or borrowing rule failure
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") ?? "ALL") as LoanStatus | "ALL";
    const loans = await getLabRepository().listLoans(status);
    return NextResponse.json({ loans });
  } catch (error) {
    console.error("GET /api/loans error:", error);
    return NextResponse.json(
      { error: "Failed to fetch loans" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid checkout request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const loan = await getLabService().checkoutEquipment(parsed.data);
    return NextResponse.json({ loan }, { status: 201 });
  } catch (error) {
    if (error instanceof LabServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("POST /api/loans error:", error);
    return NextResponse.json(
      { error: "Failed to process checkout" },
      { status: 500 }
    );
  }
}
