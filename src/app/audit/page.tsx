"use client";

import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatBDT,
  formatCondition,
  formatEventType,
  formatPolicy,
} from "@/lib/utils";
import type { AuditLogDTO, FineDTO } from "@/lib/types";

export default function AuditAndFinesPage() {
  const [fines, setFines] = useState<FineDTO[]>([]);
  const [logs, setLogs] = useState<AuditLogDTO[]>([]);

  const loadData = async () => {
    const [finesRes, analyticsRes] = await Promise.all([
      fetch("/api/fines"),
      fetch("/api/analytics"),
    ]);
    if (finesRes.ok) {
      const j = (await finesRes.json()) as { fines: FineDTO[] };
      setFines(j.fines);
    }
    if (analyticsRes.ok) {
      const j = (await analyticsRes.json()) as {
        recentAuditLogs: AuditLogDTO[];
      };
      setLogs(j.recentAuditLogs);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/fines").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/analytics").then((r) => (r.ok ? r.json() : null)),
    ]).then(([finesJson, analyticsJson]) => {
      if (!active) return;
      if (finesJson) setFines((finesJson as { fines: FineDTO[] }).fines);
      if (analyticsJson)
        setLogs(
          (analyticsJson as { recentAuditLogs: AuditLogDTO[] }).recentAuditLogs
        );
    });
    return () => {
      active = false;
    };
  }, []);

  const settleFine = async (id: string, status: "Settled" | "Waived") => {
    await fetch(`/api/fines/${id}/settle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadData();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Fines Ledger &amp; Audit Trail
        </h1>
        <p className="text-sm text-muted-foreground">
          Settle or waive assessed hardware fines and review immutable Observer
          audit records.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assessed Fines</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Strategy &amp; Reason</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fines.map((fine) => (
                <TableRow key={fine.id}>
                  <TableCell className="font-mono text-xs">
                    {fine.studentId}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {formatCondition(fine.condition)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-medium text-primary">
                      {formatPolicy(fine.strategyUsed)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {fine.reason}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold tabular-nums">
                    {formatBDT(fine.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        fine.status === "Pending" ? "destructive" : "secondary"
                      }
                    >
                      {fine.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {fine.status === "Pending" && (
                      <div className="inline-flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => settleFine(fine.id, "Settled")}
                        >
                          <Check className="mr-1 h-3.5 w-3.5" />
                          Settle
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => settleFine(fine.id, "Waived")}
                        >
                          Waive
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Immutable Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead className="text-right">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {formatEventType(log.eventType)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.actor}</TableCell>
                  <TableCell className="text-xs">
                    {log.targetName ?? log.targetId ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs">{log.summary}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
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
