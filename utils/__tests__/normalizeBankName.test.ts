/**
 * Tests for Bank Name Normalization
 */

import { normalizeBankName } from "../normalizeBankName";

describe("normalizeBankName", () => {
  it("should convert uppercase to title case", () => {
    expect(normalizeBankName("HDFC BANK")).toBe("Hdfc Bank");
    expect(normalizeBankName("STATE BANK OF INDIA")).toBe("State Bank Of India");
  });

  it("should convert lowercase to title case", () => {
    expect(normalizeBankName("hdfc bank")).toBe("Hdfc Bank");
    expect(normalizeBankName("axis bank")).toBe("Axis Bank");
  });

  it("should convert mixed case to title case", () => {
    expect(normalizeBankName("HdFc BaNk")).toBe("Hdfc Bank");
    expect(normalizeBankName("AxIs BaNK")).toBe("Axis Bank");
  });

  it("should handle single word bank names", () => {
    expect(normalizeBankName("ICICI")).toBe("Icici");
    expect(normalizeBankName("hdfc")).toBe("Hdfc");
  });

  it("should handle multiple spaces", () => {
    expect(normalizeBankName("HDFC  BANK")).toBe("Hdfc Bank");
    expect(normalizeBankName("STATE   BANK   OF   INDIA")).toBe("State Bank Of India");
  });

  it("should trim leading and trailing spaces", () => {
    expect(normalizeBankName("  HDFC BANK  ")).toBe("Hdfc Bank");
    expect(normalizeBankName("   axis bank   ")).toBe("Axis Bank");
  });

  it("should return undefined for empty strings", () => {
    expect(normalizeBankName("")).toBeUndefined();
    expect(normalizeBankName("   ")).toBeUndefined();
  });

  it("should return undefined for null/undefined input", () => {
    expect(normalizeBankName(undefined)).toBeUndefined();
    expect(normalizeBankName(null as any)).toBeUndefined();
  });

  it("should handle special characters", () => {
    expect(normalizeBankName("HDFC-BANK")).toBe("Hdfc-bank");
    expect(normalizeBankName("BANK&CO")).toBe("Bank&co");
  });
});

