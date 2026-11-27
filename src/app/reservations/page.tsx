"use client";

import React, { useEffect, useState } from "react";
import { CalendarPlus, CheckCircle2, XCircle } from "lucide-react";
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
import type { EquipmentDTO, ReservationDTO } from "@/lib/types";

const WORKBENCHES = [
  "Bench 01 - High Voltage & Signal",
  "Bench 02 - Digital Debug",
  "Bench 03 - Embedded Soldering",
];

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<ReservationDTO[]>([]);
  const [instruments, setInstruments] = useState<EquipmentDTO[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    equipmentId: "",
    workbench: WORKBENCHES[0],
    studentId: "2203125",
    studentName: "Tasnim Akter",
    purpose: "Oscilloscope SPI bus verification",
    startTime: "",
    endTime: "",
  });

  const loadData = async () => {
    const [resR, eqR] = await Promise.all([
      fetch("/api/reservations"),
      fetch("/api/equipment?category=HighValueInstrument"),
    ]);
    if (resR.ok) {
      const j = (await resR.json()) as { reservations: ReservationDTO[] };
      setReservations(j.reservations);
    }
    if (eqR.ok) {
      const j = (await eqR.json()) as { items: EquipmentDTO[] };
      setInstruments(j.items);
      if (!form.equipmentId && j.items.length > 0) {
        setForm((p) => ({ ...p, equipmentId: j.items[0].id }));
      }
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/reservations").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/equipment?category=HighValueInstrument").then((r) =>
        r.ok ? r.json() : null
      ),
    ]).then(([resJson, eqJson]) => {
      if (!active) return;
      if (resJson)
        setReservations(
          (resJson as { reservations: ReservationDTO[] }).reservations
        );
      if (eqJson) {
        const items = (eqJson as { items: EquipmentDTO[] }).items;
        setInstruments(items);
        if (items.length > 0) {
          setForm((p) => ({
            ...p,
            equipmentId: p.equipmentId || items[0].id,
            startTime:
              p.startTime ||
              new Date(Date.now() + 3600000).toISOString().slice(0, 16),
            endTime:
              p.endTime ||
              new Date(Date.now() + 7200000).toISOString().slice(0, 16),
          }));
        }
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        equipmentId: form.equipmentId || null,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Reservation failed");
      return;
    }
    setOpen(false);
    await loadData();
  };

  const updateStatus = async (
    id: string,
    status: "Completed" | "Cancelled"
  ) => {
    await fetch(`/api/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadData();
  };

  const selectedInstrument = instruments.find((i) => i.id === form.equipmentId);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Lab Slot Reservations
          </h1>
          <p className="text-sm text-muted-foreground">
            Book high-value instruments and lab workbenches with automatic
            overlap conflict prevention.
          </p>
        </div>

        <Button size="sm" onClick={() => setOpen(true)}>
          <CalendarPlus className="mr-1.5 h-4 w-4" />
          Reserve Lab Slot
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reserve Workbench / Instrument</DialogTitle>
              <DialogDescription>
                Overlapping confirmed reservations on the same workbench are
                blocked automatically.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label>Workbench</Label>
                <Select
                  value={form.workbench}
                  onValueChange={(v) =>
                    setForm({ ...form, workbench: v ?? WORKBENCHES[0] })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{form.workbench}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {WORKBENCHES.map((wb) => (
                      <SelectItem key={wb} value={wb}>
                        {wb}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>High-Value Instrument (optional)</Label>
                <Select
                  value={form.equipmentId}
                  onValueChange={(v) =>
                    setForm({ ...form, equipmentId: v ?? "" })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select instrument">
                      {selectedInstrument?.name ?? "Select instrument"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {instruments.map((ins) => (
                      <SelectItem key={ins.id} value={ins.id}>
                        {ins.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Student Roll</Label>
                  <Input
                    required
                    placeholder="2203125"
                    value={form.studentId}
                    onChange={(e) =>
                      setForm({ ...form, studentId: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Student Name</Label>
                  <Input
                    required
                    placeholder="Tasnim Akter"
                    value={form.studentName}
                    onChange={(e) =>
                      setForm({ ...form, studentName: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="datetime-local"
                    required
                    value={form.startTime}
                    onChange={(e) =>
                      setForm({ ...form, startTime: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="datetime-local"
                    required
                    value={form.endTime}
                    onChange={(e) =>
                      setForm({ ...form, endTime: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Purpose</Label>
                <Input
                  required
                  value={form.purpose}
                  onChange={(e) =>
                    setForm({ ...form, purpose: e.target.value })
                  }
                />
              </div>
              <DialogFooter>
                <Button type="submit">Confirm Slot</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scheduled Lab Slots</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workbench &amp; Instrument</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Time Window</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.workbench}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.equipmentName ?? "General Workbench"} · {r.purpose}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{r.studentName}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {r.studentId}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <div>{new Date(r.startTime).toLocaleString()}</div>
                    <div className="text-muted-foreground">
                      to {new Date(r.endTime).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === "Confirmed"
                          ? "default"
                          : r.status === "Completed"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "Confirmed" && (
                      <div className="inline-flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => updateStatus(r.id, "Completed")}
                          title="Mark completed"
                        >
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => updateStatus(r.id, "Cancelled")}
                          title="Cancel slot"
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
