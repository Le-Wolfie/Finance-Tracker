const EGP = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number): string {
  return EGP.format(value ?? 0);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-EG").format(value ?? 0);
}

export function formatPercent(value: number): string {
  return `${(value ?? 0).toFixed(1)}%`;
}

export function formatDate(isoDate: string): string {
  const value = new Date(isoDate);
  if (Number.isNaN(value.getTime())) {
    return "-";
  }

  return value.toLocaleDateString("en-EG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-EG", {
    year: "numeric",
    month: "long",
  });
}
