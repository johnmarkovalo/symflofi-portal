"use client";

export function LocalTime({ date, dateOnly }: { date: string; dateOnly?: boolean }) {
  const d = new Date(date);
  return <>{dateOnly ? d.toLocaleDateString() : d.toLocaleString()}</>;
}
