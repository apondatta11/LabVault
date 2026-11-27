"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { formatBDT, formatCategory } from "@/lib/utils";
import type { EquipmentCategory, EquipmentDTO } from "@/lib/types";

export default function InventoryPage() {
  const [items, setItems] = useState<EquipmentDTO[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<EquipmentCategory | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    serialNumber: "",
    category: "ReturnableComponent" as EquipmentCategory,
    description: "",
    totalStock: "10",
    minStockAlert: "3",
    replacementCost: "1500",
    location: "Rack A1 - Embedded Systems",
  });

  const fetchItems = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (category !== "ALL") params.set("category", category);
    const res = await fetch(`/api/equipment?${params.toString()}`);
    if (res.ok) {
      const json = (await res.json()) as { items: EquipmentDTO[] };
      setItems(json.items);
    }
    setLoading(false);
  }, [search, category]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (category !== "ALL") params.set("category", category);
    fetch(`/api/equipment?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { items: EquipmentDTO[] } | null) => {
        if (active && json) setItems(json.items);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [search, category]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        sku: form.sku,
        serialNumber: form.serialNumber.trim() || null,
        category: form.category,
        description: form.description,
        totalStock: Number(form.totalStock),
        minStockAlert: Number(form.minStockAlert),
        replacementCost: Number(form.replacementCost),
        location: form.location,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to create equipment");
      return;
    }
    setOpen(false);
    setForm({
      name: "",
      sku: "",
      serialNumber: "",
      category: "ReturnableComponent",
      description: "",
      totalStock: "10",
      minStockAlert: "3",
      replacementCost: "1500",
      location: "Rack A1 - Embedded Systems",
    });
    await fetchItems();
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/equipment/${id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchItems();
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Equipment &amp; Kit Inventory
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage microcontrollers, sensors, consumables, and high-value lab
            instruments.
          </p>
        </div>

        <Button
          size="sm"
          data-testid="add-equipment-btn"
          onClick={() => setOpen(true)}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Hardware
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Register Hardware Component</DialogTitle>
              <DialogDescription>
                Add a new item to the CSE 3206 LabVault catalog.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="eq-name">Name</Label>
                  <Input
                    id="eq-name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Raspberry Pi 5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eq-sku">SKU</Label>
                  <Input
                    id="eq-sku"
                    required
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="SBC-RPI5-8G"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        category: (v ?? "ReturnableComponent") as EquipmentCategory,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>{formatCategory(form.category)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Consumable">Consumable</SelectItem>
                      <SelectItem value="ReturnableComponent">
                        Returnable Component
                      </SelectItem>
                      <SelectItem value="HighValueInstrument">
                        High-Value Instrument
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eq-serial">Serial Number (optional)</Label>
                  <Input
                    id="eq-serial"
                    value={form.serialNumber}
                    onChange={(e) =>
                      setForm({ ...form, serialNumber: e.target.value })
                    }
                    placeholder="SN-2026-01"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="eq-stock">Total Stock</Label>
                  <Input
                    id="eq-stock"
                    type="number"
                    min={1}
                    required
                    value={form.totalStock}
                    onChange={(e) =>
                      setForm({ ...form, totalStock: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eq-alert">Min Alert</Label>
                  <Input
                    id="eq-alert"
                    type="number"
                    min={0}
                    required
                    value={form.minStockAlert}
                    onChange={(e) =>
                      setForm({ ...form, minStockAlert: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eq-cost">Cost (৳)</Label>
                  <Input
                    id="eq-cost"
                    type="number"
                    step="1"
                    min={0}
                    required
                    value={form.replacementCost}
                    onChange={(e) =>
                      setForm({ ...form, replacementCost: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="eq-loc">Rack / Bench Location</Label>
                <Input
                  id="eq-loc"
                  required
                  value={form.location}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eq-desc">Description</Label>
                <Textarea
                  id="eq-desc"
                  required
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <DialogFooter>
                <Button type="submit">Save Equipment</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                data-testid="inventory-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, SKU, or rack..."
                className="pl-8"
              />
            </div>
            <Tabs
              value={category}
              onValueChange={(v) => setCategory(v as EquipmentCategory | "ALL")}
            >
              <TabsList>
                <TabsTrigger value="ALL">All</TabsTrigger>
                <TabsTrigger value="ReturnableComponent">
                  Returnable Component
                </TabsTrigger>
                <TabsTrigger value="HighValueInstrument">
                  High-Value Instrument
                </TabsTrigger>
                <TabsTrigger value="Consumable">Consumable</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {loading ? "Loading catalog..." : `${items.length} hardware item(s)`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-2.5">Component</TableHead>
                <TableHead className="px-2.5">SKU / Serial</TableHead>
                <TableHead className="px-2.5">Category</TableHead>
                <TableHead className="px-2.5">Location</TableHead>
                <TableHead className="px-2.5 text-right">Stock</TableHead>
                <TableHead className="px-2.5 text-right">Cost</TableHead>
                <TableHead className="px-2.5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const low = item.availableStock <= item.minStockAlert;
                return (
                  <TableRow
                    key={item.id}
                    data-testid={`equipment-row-${item.sku}`}
                  >
                    <TableCell className="max-w-[230px] px-2.5 py-2.5">
                      <div className="truncate font-medium">{item.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    </TableCell>
                    <TableCell className="px-2.5 py-2.5 font-mono text-xs whitespace-nowrap">
                      <div>{item.sku}</div>
                      {item.serialNumber && (
                        <div className="text-muted-foreground">
                          {item.serialNumber}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-2.5 py-2.5 whitespace-nowrap">
                      <Badge variant="secondary" className="text-[11px]">
                        {formatCategory(item.category)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate px-2.5 py-2.5 text-xs text-muted-foreground">
                      {item.location}
                    </TableCell>
                    <TableCell className="px-2.5 py-2.5 text-right whitespace-nowrap">
                      <Badge
                        variant={low ? "destructive" : "outline"}
                        className="font-mono tabular-nums"
                      >
                        {item.availableStock} / {item.totalStock}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2.5 py-2.5 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                      {formatBDT(item.replacementCost)}
                    </TableCell>
                    <TableCell className="px-2.5 py-2.5 text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        aria-label={`Delete ${item.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
