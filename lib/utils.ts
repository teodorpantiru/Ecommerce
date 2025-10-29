import { clsx, type ClassValue } from "clsx";
import { error } from "console";
import { twMerge } from "tailwind-merge";
import { ZodError } from "zod";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert prisma object into a rejular js object

export function convertToPlainObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function formatNumberWithDecimal(num: number): string {
  const [int, decimal] = num.toString().split(".");
  return decimal ? `${int}.${decimal.padEnd(2, "0")}` : `${int}.00`;
}
// Format  number with decimal places
export function formatError(error: unknown) {
  // Case 1: Real ZodError instance
  if (error instanceof ZodError) {
    return error.issues.map((err) => err.message).join(". ");
  }

  return "Something went wrong.";
}

//Round number to 2 decimal places

export function round2(value: number | string) {
  if (typeof value === "number") {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  } else if (typeof value === "string") {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  } else {
    throw new Error("Value is not a number or string");
  }
}

const CURRENTY_FORMATER = new Intl.NumberFormat("en-Europe", {
  currency: "RON",
  style: "currency",
  minimumFractionDigits: 2,
});

// Format currency using the formater above
export function formatCurrency(amount: number | string | null) {
  if (typeof amount === "number") {
    return CURRENTY_FORMATER.format(amount);
  } else if (typeof amount === "string") {
    return CURRENTY_FORMATER.format(Number(amount));
  } else {
    return "NaN";
  }
}
