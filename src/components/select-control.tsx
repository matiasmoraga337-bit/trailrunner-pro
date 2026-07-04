"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Option {
  value: string;
  label: string;
}

/**
 * Select controlado por value/onValueChange que admite placeholder.
 * Pensado para usar con react-hook-form `Controller` o `useController`.
 */
export function SelectControl({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value?: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <Select value={value ?? ""} onValueChange={(v) => onChange((v as string) ?? "")}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}