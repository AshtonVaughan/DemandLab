const FIELD_ALIASES = {
  product: "product_name",
  productname: "product_name",
  product_name: "product_name",
  name: "product_name",
  brand: "brand",
  category: "category",
  subcategory: "subcategory",
  features: "features",
  ingredients: "features",
  positioning: "positioning",
  audience: "audience",
  channel: "channel",
  price: "price",
  retailprice: "price",
  retail_price: "price",
  cost: "cost",
  rating: "rating",
  reviews: "reviews",
  reviewcount: "reviews",
  review_count: "reviews",
  monthlysales: "monthly_sales",
  monthly_sales: "monthly_sales",
  sales: "monthly_sales",
  conversion: "conversion_rate",
  conversionrate: "conversion_rate",
  conversion_rate: "conversion_rate",
  cac: "cac",
  returns: "return_rate",
  returnrate: "return_rate",
  return_rate: "return_rate",
  reviewstrengths: "review_strengths",
  review_strengths: "review_strengths",
  reviewcomplaints: "review_complaints",
  review_complaints: "review_complaints",
  url: "url",
  sourceurl: "url",
  source_url: "url",
  source: "source",
  observedat: "observed_at",
  observed_at: "observed_at",
};

export function normalizeHeader(header) {
  const normalized = String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return FIELD_ALIASES[normalized] || normalized;
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  row.push(value.trim());
  if (row.some((cell) => cell !== "")) rows.push(row);
  if (quoted) throw new Error("The CSV contains an unclosed quoted value.");
  if (rows.length < 2) throw new Error("The CSV needs a header and at least one data row.");

  const originalHeaders = rows[0].map((header) => header.trim());
  const headers = originalHeaders.map(normalizeHeader);
  if (new Set(headers).size !== headers.length) throw new Error("Two or more CSV columns resolve to the same field name.");

  const data = rows.slice(1).map((cells, rowIndex) =>
    headers.reduce((record, header, index) => {
      record[header] = cells[index] ?? "";
      record.__row = rowIndex + 2;
      return record;
    }, {}),
  );

  return { headers, originalHeaders, data };
}

export function csvToText(headers, rows) {
  const encode = (value) => {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [headers.map(encode).join(","), ...rows.map((row) => headers.map((header) => encode(row[header])).join(","))].join("\n");
}
