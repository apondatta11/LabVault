"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Cpu,
  DollarSign,
  PackageCheck,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBDT, formatCategory, formatEventType } from "@/lib/utils";
import type { DashboardAnalyticsDTO } from "@/lib/types";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardAnalyticsDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const json = (await res.json()) as DashboardAnalyticsDTO;
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch("/api/analytics")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: DashboardAnalyticsDTO | null) => {
        if (active && json) setData(json);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const kpis = [
    {
      label: "Active Loans",
      value: data?.activeLoansCount ?? "—",
      sub: `${data?.overdueLoansCount ?? 0} overdue`,
      icon: PackageCheck,
      alert: (data?.overdueLoansCount ?? 0) > 0,
    },
    {
      label: "Low-Stock Alerts",
      value: data?.lowStockItemsCount ?? "—",
      sub: "At or below threshold",
      icon: AlertTriangle,
      alert: (data?.lowStockItemsCount ?? 0) > 0,
    },
    {
      label: "Pending Fines",
      value: data ? formatBDT(data.pendingFinesAmount) : "—",
      sub: `Total assessed: ${formatBDT(data?.totalFinesAmount ?? 0)}`,
      icon: DollarSign,
      alert: (data?.pendingFinesAmount ?? 0) > 0,
    },
    {
      label: "Confirmed Slots",
      value: data?.upcomingReservationsCount ?? "—",
      sub: `${data?.totalUnitsAvailable ?? 0} units available`,
      icon: CalendarClock,
      alert: false,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Lab Operations Overview
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time hardware inventory, active checkouts, fine ledger, and
            audit trail.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAnalytics}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Link
            href="/loans"
            className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            New Checkout
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16, delay: idx * 0.04 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardDescription className="text-xs font-medium uppercase tracking-wider">
                    {kpi.label}
                  </CardDescription>
                  <Icon
                    className={`h-4 w-4 ${
                      kpi.alert ? "text-destructive" : "text-muted-foreground"
                    }`}
                  />
                </CardHeader>
                <CardContent>
                  <div className="font-mono text-2xl font-semibold tabular-nums">
                    {kpi.value}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {kpi.sub}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low Stock & Category Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  Low-Stock Hardware Alerts
                </CardTitle>
                <CardDescription>
                  Components at or below minimum stock threshold
                </CardDescription>
              </div>
              <Link
                href="/inventory"
                className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-accent"
              >
                Manage Stock
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.lowStockItems.length ? (
              data.lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2.5"
                >
                  <div>
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {item.sku} · {item.location}
                    </div>
                  </div>
                  <Badge variant="destructive" className="font-mono tabular-nums">
                    {item.availableStock} / {item.totalStock} left
                  </Badge>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                All hardware stock levels are healthy.
              </div>
            )}

            <div className="pt-2">
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Category Stock Distribution
              </div>
              <div className="grid grid-cols-3 gap-2">
                {data?.categoryBreakdown.map((cat) => (
                  <div
                    key={cat.category}
                    className="rounded-md border border-border bg-background p-2.5"
                  >
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Cpu className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {formatCategory(cat.category)}
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-sm font-semibold tabular-nums">
                      {cat.available} units
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {cat.count} SKUs
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Audit Trail */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  Immutable Audit Trail
                </CardTitle>
                <CardDescription>
                  Observer-captured checkout, return, and stock events
                </CardDescription>
              </div>
              <Link
                href="/audit"
                className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-accent"
              >
                View All
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {data?.recentAuditLogs.length ? (
              data.recentAuditLogs.slice(0, 6).map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {formatEventType(log.eventType)}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground">
                        {log.actor}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-foreground">
                      {log.summary}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No audit events recorded yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
