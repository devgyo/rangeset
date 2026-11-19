"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { JacketSpec } from "@/components/spec-value";
import { fields, groups } from "@/lib/specs";
import type { Jacket } from "@/lib/types";

const filters = [
  { key: "brand", label: "Brand", all: "All brands", read: (jacket: Jacket) => jacket.brand },
  { key: "membrane", label: "Membrane", all: "All membranes", read: (jacket: Jacket) => jacket.specs.membrane?.value },
  { key: "layers", label: "Layers", all: "All layers", read: (jacket: Jacket) => jacket.specs.layers?.value?.toString() },
] as const;

const sorts = {
  default: { label: "Catalog order" },
  "weight-asc": { label: "Weight ↑", key: "weight", direction: 1 },
  "weight-desc": { label: "Weight ↓", key: "weight", direction: -1 },
  "price-asc": { label: "Price ↑", key: "price", direction: 1 },
  "price-desc": { label: "Price ↓", key: "price", direction: -1 },
} as const;

type Sort = keyof typeof sorts;
type FilterKey = (typeof filters)[number]["key"];

function CatalogSelect({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <label className="control-label" htmlFor={`catalog-${label}`}>{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={`catalog-${label}`} className="w-full data-[size=default]:h-10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="start" className="motion-reduce:animate-none">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function JacketTable({ jackets }: { jackets: Jacket[] }) {
  const [filterValues, setFilterValues] = useState<Partial<Record<FilterKey, string>>>({});
  const [sort, setSort] = useState<Sort>("default");
  const [visibleGroups, setVisibleGroups] = useState<string[]>([...groups]);
  const [selected, setSelected] = useState<string[]>([]);

  const visibleFields = fields.filter((field) => visibleGroups.includes(field.group));
  const visibleJackets = jackets.filter((jacket) => filters.every(({ key, read }) => {
    const value = filterValues[key];
    return !value || value === "all" || value === `value:${read(jacket)}`;
  }));

  const ordering = sorts[sort];
  if ("key" in ordering) {
    visibleJackets.sort((a, b) => {
      const first = a.specs[ordering.key]?.value;
      const second = b.specs[ordering.key]?.value;
      if (first == null) return second == null ? 0 : 1;
      if (second == null) return -1;
      return (first - second) * ordering.direction;
    });
  }

  const compareLabel = selected.length ? `Compare (${selected.length})` : "Compare";

  function toggleJacket(slug: string) {
    setSelected((current) => {
      if (current.includes(slug)) return current.filter((id) => id !== slug);
      return current.length < 4 ? [...current, slug] : current;
    });
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 border-y border-border py-5 sm:grid-cols-4 sm:gap-4">
        {filters.map(({ key, label, all, read }) => {
          const values = [...new Set(jackets.map(read).filter((value): value is string => Boolean(value)))];
          values.sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
          return (
            <CatalogSelect
              key={key}
              label={label}
              value={filterValues[key] ?? "all"}
              onChange={(value) => setFilterValues((current) => ({ ...current, [key]: value }))}
              options={[{ value: "all", label: all }, ...values.map((value) => ({ value: `value:${value}`, label: value }))]}
            />
          );
        })}
        <CatalogSelect
          label="Sort"
          value={sort}
          onChange={(value) => setSort(value as Sort)}
          options={Object.entries(sorts).map(([value, { label }]) => ({ value, label }))}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 py-4">
        <ToggleGroup type="multiple" value={visibleGroups} onValueChange={setVisibleGroups} aria-label="Column groups">
          {groups.map((group) => (
            <ToggleGroupItem key={group} value={group} variant="outline" className="h-9 px-3 data-[state=on]:border-primary/40 data-[state=on]:bg-primary/10 data-[state=on]:text-primary">
              {group}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="flex items-center gap-2.5">
          {selected.length > 0 && (
            <Button variant="ghost" className="h-9 text-muted-foreground" onClick={() => setSelected([])}>
              Clear selection
            </Button>
          )}
          {selected.length >= 2 ? (
            <Button asChild className="h-9">
              <Link href={`/compare?ids=${selected.map(encodeURIComponent).join(",")}`}>
                {compareLabel} <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          ) : (
            <Button disabled className="h-9">{compareLabel} <ArrowRight aria-hidden="true" /></Button>
          )}
          <span className="sr-only" role="status">{selected.length} of 4 jackets selected.</span>
        </div>
      </div>
      <div className="data-panel">
        <Table aria-label="Jacket specs" scrollLabel="Scrollable jacket table" className="spec-table">
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className="sticky-cell">Brand</TableHead>
              <TableHead scope="col">Model</TableHead>
              {visibleFields.map(({ key, label }) => (
                <TableHead key={key} scope="col" aria-sort={("key" in ordering && key === ordering.key) ? (ordering.direction === 1 ? "ascending" : "descending") : undefined}>
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleJackets.map((jacket) => {
              const checked = selected.includes(jacket.slug);
              return (
                <TableRow key={jacket.slug} data-state={checked ? "selected" : undefined}>
                  <TableCell className="sticky-cell">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        className="size-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
                        aria-label={`Compare ${jacket.brand} ${jacket.model}`}
                        checked={checked}
                        disabled={!checked && selected.length === 4}
                        onChange={() => toggleJacket(jacket.slug)}
                      />
                      <span>{jacket.brand}</span>
                    </div>
                  </TableCell>
                  <TableHead scope="row" className="h-auto py-3 font-medium">
                    <Link href={`/jackets/${jacket.slug}`} className="spec-link">
                      {jacket.model}
                    </Link>
                    {jacket.status === "discontinued" && <Badge variant="outline" className="mt-1.5 flex w-fit">Discontinued</Badge>}
                    {jacket.example && <Badge variant="outline" className="example-badge mt-1.5 flex w-fit">Example data</Badge>}
                  </TableHead>
                  {visibleFields.map((field) => (
                    <TableCell key={field.key}><JacketSpec specs={jacket.specs} field={field} /></TableCell>
                  ))}
                </TableRow>
              );
            })}
            {visibleJackets.length === 0 && (
              <TableRow>
                <TableCell colSpan={2 + visibleFields.length} className="sticky left-0 py-8 text-muted-foreground">
                  {jackets.length ? "No jackets match these filters." : "No jackets in the index yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="mt-3 font-mono text-xs text-muted-foreground" role="status">
        {visibleJackets.length} {visibleJackets.length === 1 ? "jacket" : "jackets"}
      </p>
    </div>
  );
}
