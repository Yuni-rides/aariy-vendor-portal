import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  /** Public S3 bucket for uploaded files. A file key becomes <S3 base>/<key>. */
  NEXT_PUBLIC_S3_BASE_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_S3_BASE_URL: process.env.NEXT_PUBLIC_S3_BASE_URL || undefined,
  NODE_ENV: process.env.NODE_ENV,
});