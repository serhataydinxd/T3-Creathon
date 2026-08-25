import { describe, expect, it } from "vitest";
import { parseBootstrapManagerInput } from "@/server/domain/bootstrap-manager";

describe("production manager bootstrap validation", () => {
  it("normalizes a valid manager identity", () => {
    expect(
      parseBootstrapManagerInput({
        BOOTSTRAP_MANAGER_EMAIL: " Manager@Example.COM ",
        BOOTSTRAP_MANAGER_NAME: "  Production Manager ",
        BOOTSTRAP_MANAGER_PASSWORD: "A-valid-password-2026!",
      }),
    ).toEqual({
      email: "manager@example.com",
      name: "Production Manager",
      password: "A-valid-password-2026!",
    });
  });

  it.each([
    "short!A1",
    "all-lowercase-2026!",
    "ALL-UPPERCASE-2026!",
    "NoNumbersAllowed!",
    "NoSymbolsAllowed2026",
  ])("rejects a weak password", (password) => {
    expect(() =>
      parseBootstrapManagerInput({
        BOOTSTRAP_MANAGER_EMAIL: "manager@example.com",
        BOOTSTRAP_MANAGER_NAME: "Production Manager",
        BOOTSTRAP_MANAGER_PASSWORD: password,
      }),
    ).toThrow();
  });

  it("requires every bootstrap variable", () => {
    expect(() => parseBootstrapManagerInput({})).toThrow();
  });
});
