import { z } from "zod";

const strongPassword = z
  .string()
  .min(14, "BOOTSTRAP_MANAGER_PASSWORD must contain at least 14 characters.")
  .max(128, "BOOTSTRAP_MANAGER_PASSWORD must contain at most 128 characters.")
  .refine((value) => /[a-z]/.test(value), "Password must contain a lowercase letter.")
  .refine((value) => /[A-Z]/.test(value), "Password must contain an uppercase letter.")
  .refine((value) => /\d/.test(value), "Password must contain a number.")
  .refine((value) => /[^A-Za-z0-9]/.test(value), "Password must contain a symbol.");

const bootstrapManagerSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  name: z.string().trim().min(2).max(80),
  password: strongPassword,
});

export type BootstrapManagerInput = z.infer<typeof bootstrapManagerSchema>;

export function parseBootstrapManagerInput(
  env: Readonly<Record<string, string | undefined>>,
): BootstrapManagerInput {
  return bootstrapManagerSchema.parse({
    email: env.BOOTSTRAP_MANAGER_EMAIL,
    name: env.BOOTSTRAP_MANAGER_NAME,
    password: env.BOOTSTRAP_MANAGER_PASSWORD,
  });
}
