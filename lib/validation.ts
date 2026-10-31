import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const postcode = z.string().trim().toUpperCase().regex(/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/, "Enter a UK postcode, e.g. BS6 5QX");

export const propertySchema = z.object({
  market: z.enum(["SALE", "LET"]),
  address: z.string().trim().min(3, "Enter the address").max(200),
  postcode,
  kind: z.enum(["house", "flat", "bungalow", "other"]),
  bedrooms: z.coerce.number().int().min(0).max(20),
  price: z.coerce.number().int().min(1, "Enter the price or monthly rent").max(100_000_000),
  summary: z.string().trim().max(2000).default(""),
  features: z.string().trim().max(1000).default(""),
});

export const applicantSchema = z.object({
  firstName: z.string().trim().min(1, "Enter a first name").max(60),
  lastName: z.string().trim().min(1, "Enter a last name").max(60),
  phone: z.string().trim().max(30).default(""),
  email: z.string().trim().max(120).default(""),
  market: z.enum(["SALE", "LET"]),
  minBedrooms: z.coerce.number().int().min(0).max(20),
  maxPrice: z.coerce.number().int().min(1, "Enter their budget").max(100_000_000),
  areas: z.string().trim().max(300).default(""),
  notes: z.string().trim().max(1000).default(""),
});

export const signupSchema = z.object({
  agencyName: z.string().trim().min(2, "Enter your agency's name").max(80),
  firstName: z.string().trim().min(1, "Enter your first name").max(60),
  lastName: z.string().trim().min(1, "Enter your last name").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(10, "Use at least 10 characters").max(200),
});

export const memberSchema = z.object({
  firstName: z.string().trim().min(1, "Enter a first name").max(60),
  lastName: z.string().trim().min(1, "Enter a last name").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(["ADMIN", "NEGOTIATOR"]),
});
