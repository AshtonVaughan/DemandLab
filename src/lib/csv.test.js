import { describe, expect, it } from "vitest";
import { csvToText, normalizeHeader, parseCsv } from "./csv";

describe("CSV evidence parsing", () => {
  it("normalizes supported aliases and quoted values", () => {
    const parsed = parseCsv('Product Name,Brand,Retail Price,Review Count\n"Serum, Calm",Acme,$42,120');
    expect(parsed.headers).toEqual(["product_name", "brand", "price", "reviews"]);
    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0]).toMatchObject({ product_name: "Serum, Calm", brand: "Acme", price: "$42", reviews: "120" });
  });

  it("rejects malformed and duplicate normalized headers", () => {
    expect(() => parseCsv("name,product_name\nA,B")).toThrow(/same field name/i);
    expect(() => parseCsv('name,brand\n"Unclosed,Acme')).toThrow(/unclosed/i);
    expect(() => parseCsv("name\n")).toThrow(/header and at least one data row/i);
  });

  it("round trips commas, quotes, and newlines", () => {
    const text = csvToText(["product_name", "notes"], [{ product_name: 'One "Plus"', notes: "Line 1\nLine 2" }]);
    const parsed = parseCsv(text);
    expect(parsed.data[0].product_name).toBe('One "Plus"');
    expect(parsed.data[0].notes).toBe("Line 1\nLine 2");
  });

  it("normalizes individual headers", () => {
    expect(normalizeHeader("Monthly Sales")).toBe("monthly_sales");
    expect(normalizeHeader("Observed At")).toBe("observed_at");
  });
});
