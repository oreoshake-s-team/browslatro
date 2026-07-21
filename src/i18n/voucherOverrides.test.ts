import { localizedVoucherDescription, localizedVoucherName } from "./voucherOverrides";

describe("voucherOverrides", () => {
  test("localizedVoucherName returns the canonical i18n name, not the code fallback", () => {
    expect(localizedVoucherName("en", "clearance-sale", "Clearance Sale (fallback)")).toBe(
      "Clearance Sale",
    );
  });

  test("localizedVoucherName returns the fallback for an unknown id", () => {
    expect(localizedVoucherName("en", "not-a-voucher", "Fallback")).toBe("Fallback");
  });

  test("localizedVoucherDescription returns the canonical en description", () => {
    expect(localizedVoucherDescription("en", "grabber", "fallback")).toBe(
      "+1 hand per round.",
    );
  });

  test("localizedVoucherDescription returns the fallback for an unknown id", () => {
    expect(localizedVoucherDescription("en", "not-a-voucher", "Fallback")).toBe("Fallback");
  });

  test("an untranslated haw voucher name falls back to the English text", () => {
    expect(localizedVoucherName("haw", "clearance-sale", "Clearance Sale")).toBe(
      "Clearance Sale",
    );
  });

  test("an untranslated haw voucher description falls back to the English text", () => {
    expect(localizedVoucherDescription("haw", "grabber", "fallback")).toBe(
      "+1 hand per round.",
    );
  });
});
