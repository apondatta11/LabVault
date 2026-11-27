"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ArrowDownLeft, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBDT, formatCategory, formatCondition, formatPolicy } from "@/lib/utils";
import type {
  ConditionGrade,
  EquipmentDTO,
  LoanDTO,
  LoanStatus,
} from "@/lib/types";

const CONDITION_DISPLAY: Record<ConditionGrade, string> = {
  Good: "Good (No damage)",
  MinorDamage: "Minor Damage (25% repair fee)",
  Broken: "Broken (75% replacement fee)",
  Lost: "Lost (100% replacement fee)",
};

const POLICY_DISPLAY: Record<"standard" | "damaged" | "grace", string> = {
  standard: "Standard Late Fee (৳50/day)",
  damaged: "Damaged Item Fine (Late + Condition %)",
  grace: "Academic Grace Period (2-day grace)",
};

export default function LoansPage() {
  const [loans, setLoans] = useState<LoanDTO[]>([]);
  const [equipment, setEquipment] = useState<EquipmentDTO[]>([]);
  const [statusFilter, setStatusFilter] = useState<LoanStatus | "ALL">("ALL");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [returnLoan, setReturnLoan] = useState<LoanDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const [checkoutForm, setCheckoutForm] = useState({
    equipmentId: "",
    studentId: "2103097",
    studentName: "Rafiqul Islam",
    studentEmail: "2103097@student.ruet.ac.bd",
    quantity: "1",
    notes: "",
  });

  const [returnForm, setReturnForm] = useState({
    condition: "Good" as ConditionGrade,
    policy: "standard" as "standard" | "damaged" | "grace",
  });

  const loadData = useCallback(async () => {
    const [loansRes, eqRes] = await Promise.all([
      fetch(`/api/loans?status=${statusFilter}`),
      fetch("/api/equipment"),
    ]);
    if (loansRes.ok) {
      const j = (await loansRes.json()) as { loans: LoanDTO[] };
      setLoans(j.loans);
    }
    if (eqRes.ok) {
      const j = (await eqRes.json()) as { items: EquipmentDTO[] };
      setEquipment(j.items);
      if (!checkoutForm.equipmentId && j.items.length > 0) {
        setCheckoutForm((prev) => ({ ...prev, equipmentId: j.items[0].id }));
      }
    }
  }, [statusFilter, checkoutForm.equipmentId]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`/api/loans?status=${statusFilter}`).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch("/api/equipment").then((r) => (r.ok ? r.json() : null)),
    ]).then(([loansJson, eqJson]) => {
      if (!active) return;
      if (loansJson) setLoans((loansJson as { loans: LoanDTO[] }).loans);
      if (eqJson) {
        const items = (eqJson as { items: EquipmentDTO[] }).items;
        setEquipment(items);
        if (!checkoutForm.equipmentId && items.length > 0) {
          setCheckoutForm((prev) => ({ ...prev, equipmentId: items[0].id }));
        }
      }
    });
    return () => {
      active = false;
    };
  }, [statusFilter, checkoutForm.equipmentId]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...checkoutForm,
        quantity: Number(checkoutForm.quantity),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Checkout failed");
      return;
    }
    setCheckoutOpen(false);
    setBanner(
      `Checked out ${checkoutForm.quantity} unit(s) for ${checkoutForm.studentId}.`
    );
    await loadData();
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnLoan) return;
    setError(null);
    const res = await fetch(`/api/loans/${returnLoan.id}/return`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(returnForm),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Return failed");
      return;
    }
    const fineMsg = json.fine
      ? ` Fine assessed: ${formatBDT(json.fine.amount)} (${formatPolicy(json.fine.strategyUsed)}).`
      : " No fine assessed.";
    setBanner(`Returned ${returnLoan.equipmentName}.${fineMsg}`);
    setReturnLoan(null);
    await loadData();
  };

  const selectedEquipment = equipment.find(
    (eq) => eq.id === checkoutForm.equipmentId
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Borrow &amp; Return Checkout
          </h1>
          <p className="text-sm text-muted-foreground">
            Issue components with category-aware borrowing rules and inspect
            returns via fine policies.
          </p>
        </div>

        <Button
          size="sm"
          data-testid="new-checkout-btn"
          onClick={() => setCheckoutOpen(true)}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          New Checkout
        </Button>
        <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Student Hardware Checkout</DialogTitle>
              <DialogDescription>
                Borrowing rules (loan duration &amp; slot requirements) are
                enforced automatically by category.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCheckout} className="space-y-4">
              {error && (
                <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label>Hardware Component</Label>
                <Select
                  value={checkoutForm.equipmentId}
                  onValueChange={(v) =>
                    setCheckoutForm({ ...checkoutForm, equipmentId: v ?? "" })
                  }
                >
                  <SelectTrigger
                    className="w-full"
                    data-testid="checkout-equipment-select"
                  >
                    <SelectValue placeholder="Select component">
                      {selectedEquipment
                        ? `${selectedEquipment.name} (${selectedEquipment.availableStock} available)`
                        : "Select component"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {equipment.map((eq) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.name} ({eq.availableStock} available ·{" "}
                        {formatCategory(eq.category)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="st-id">Student Roll</Label>
                  <Input
                    id="st-id"
                    data-testid="checkout-student-id"
                    required
                    placeholder="2103097"
                    value={checkoutForm.studentId}
                    onChange={(e) =>
                      setCheckoutForm({
                        ...checkoutForm,
                        studentId: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="st-qty">Quantity</Label>
                  <Input
                    id="st-qty"
                    data-testid="checkout-quantity"
                    type="number"
                    min={1}
                    required
                    value={checkoutForm.quantity}
                    onChange={(e) =>
                      setCheckoutForm({
                        ...checkoutForm,
                        quantity: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="st-name">Student Name</Label>
                  <Input
                    id="st-name"
                    required
                    placeholder="Rafiqul Islam"
                    value={checkoutForm.studentName}
                    onChange={(e) =>
                      setCheckoutForm({
                        ...checkoutForm,
                        studentName: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="st-email">Student Email</Label>
                  <Input
                    id="st-email"
                    type="email"
                    required
                    placeholder="2103097@student.ruet.ac.bd"
                    value={checkoutForm.studentEmail}
                    onChange={(e) =>
                      setCheckoutForm({
                        ...checkoutForm,
                        studentEmail: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="st-notes">Lab / Project Notes</Label>
                <Input
                  id="st-notes"
                  value={checkoutForm.notes}
                  onChange={(e) =>
                    setCheckoutForm({ ...checkoutForm, notes: e.target.value })
                  }
                  placeholder="CSE 3206 Lab 6"
                />
              </div>
              <DialogFooter>
                <Button type="submit" data-testid="submit-checkout-btn">
                  Confirm Checkout
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {banner && (
        <div
          data-testid="loan-status-banner"
          className="rounded-md border border-border bg-secondary px-4 py-2.5 text-sm text-secondary-foreground"
        >
          {banner}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Loan Ledger</CardTitle>
          <Tabs
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as LoanStatus | "ALL")}
          >
            <TabsList>
              <TabsTrigger value="ALL">All</TabsTrigger>
              <TabsTrigger value="Active">Active</TabsTrigger>
              <TabsTrigger value="Overdue">Overdue</TabsTrigger>
              <TabsTrigger value="Returned">Returned</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hardware</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fine</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((loan) => (
                <TableRow key={loan.id} data-testid={`loan-row-${loan.id}`}>
                  <TableCell>
                    <div className="font-medium">
                      {loan.equipmentName ?? "Hardware Item"}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {loan.equipmentSku}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{loan.studentName}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {loan.studentId}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {loan.quantity}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {loan.dueAt
                      ? new Date(loan.dueAt).toLocaleDateString()
                      : "Consumable (N/A)"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        loan.status === "Overdue"
                          ? "destructive"
                          : loan.status === "Active"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {loan.status}
                    </Badge>
                    {loan.conditionOnReturn && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        ({formatCondition(loan.conditionOnReturn)})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {loan.fine ? formatBDT(loan.fine.amount) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {loan.status !== "Returned" && (
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`return-btn-${loan.id}`}
                        onClick={() => {
                          setError(null);
                          setReturnLoan(loan);
                        }}
                      >
                        <ArrowDownLeft className="mr-1 h-3.5 w-3.5" />
                        Return
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Return & Damage Inspection Dialog */}
      <Dialog
        open={Boolean(returnLoan)}
        onOpenChange={(o) => !o && setReturnLoan(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return &amp; Damage Inspection</DialogTitle>
            <DialogDescription>
              Grade hardware condition and select the fine calculation policy.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReturn} className="space-y-4">
            <div className="space-y-2">
              <Label>Condition Grade</Label>
              <Select
                value={returnForm.condition}
                onValueChange={(v) =>
                  setReturnForm({
                    ...returnForm,
                    condition: (v ?? "Good") as ConditionGrade,
                  })
                }
              >
                <SelectTrigger
                  className="w-full"
                  data-testid="return-condition-select"
                >
                  <SelectValue>
                    {CONDITION_DISPLAY[returnForm.condition]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">Good (No damage)</SelectItem>
                  <SelectItem value="MinorDamage">
                    Minor Damage (25% repair fee)
                  </SelectItem>
                  <SelectItem value="Broken">
                    Broken (75% replacement fee)
                  </SelectItem>
                  <SelectItem value="Lost">
                    Lost (100% replacement fee)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fine Strategy Policy</Label>
              <Select
                value={returnForm.policy}
                onValueChange={(v) =>
                  setReturnForm({
                    ...returnForm,
                    policy: (v ?? "standard") as
                      | "standard"
                      | "damaged"
                      | "grace",
                  })
                }
              >
                <SelectTrigger
                  className="w-full"
                  data-testid="return-policy-select"
                >
                  <SelectValue>
                    {POLICY_DISPLAY[returnForm.policy]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">
                    Standard Late Fee (৳50/day)
                  </SelectItem>
                  <SelectItem value="damaged">
                    Damaged Item Fine (Late + Condition %)
                  </SelectItem>
                  <SelectItem value="grace">
                    Academic Grace Period (2-day grace)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" data-testid="confirm-return-btn">
                Confirm Return &amp; Assess Fine
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
