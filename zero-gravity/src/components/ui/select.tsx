"use client";
import * as React from "react";
import { cn } from "./cn";

export function Select({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) {
  return <div data-value={value}>{children}</div>;
}

export function SelectTrigger({ className, children, ariaLabel }: { className?: string; children: React.ReactNode; ariaLabel?: string }) {
  return <button className={cn("h-9 rounded-md border border-neutral-700 bg-neutral-900 px-3 text-sm", className)} aria-label={ariaLabel}>{children}</button>;
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span className="text-neutral-400">{placeholder}</span>;
}

export function SelectContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mt-2 w-48 rounded-md border border-neutral-700 bg-neutral-900 p-2 text-sm", className)}>{children}</div>;
}

export function SelectItem({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  return <div data-value={value} className={cn("cursor-pointer rounded px-2 py-1 hover:bg-neutral-800", className)}>{children}</div>;
}


