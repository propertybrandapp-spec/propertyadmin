// ── Flexible Price Parsing & Formatting ───────────────────────────────────────
// Supports:
// 1. Single price: 24000000 -> "₹2.40 Cr", 60000 -> "₹60,000/month"
// 2. Ranges: "6000-60000", "6000 - 60000", "₹6000 - ₹60000", "50 Lac - 1.2 Cr"
// 3. Tokens with units: "60k", "50 Lac", "1.2 Cr", "1.5 Crore"
// 4. Custom strings with Rupee sign: "₹6,000 - ₹60,000"
// 5. Keeps numericValue safe for Postgres numeric column `price_value`

export function parseNumericToken(token) {
  if (token === null || token === undefined) return null;
  const str = String(token).trim();
  if (!str) return null;

  // Clean out commas, rupee signs, extra spaces, and trailing "/month" or "per month"
  const cleaned = str
    .replace(/[₹,]/g, "")
    .replace(/\s*\/\s*(month|mo|year|yr)/i, "")
    .replace(/\s+per\s+(month|year)/i, "")
    .trim();

  if (!cleaned) return null;

  // Match number with unit: e.g. "1.5 Cr", "1.5Cr", "50 Lac", "50L", "60k", "6000"
  const m = cleaned.match(/^([\d.]+)\s*(cr|crore|crores|lac|lacs|lakh|lakhs|l|k)?$/i);
  if (!m) {
    const numOnly = cleaned.replace(/[^\d.]/g, "");
    const n = parseFloat(numOnly);
    return isNaN(n) ? null : n;
  }

  const base = parseFloat(m[1]);
  if (isNaN(base)) return null;
  const unit = (m[2] || "").toLowerCase();

  if (unit === "cr" || unit === "crore" || unit === "crores") return Math.round(base * 1e7);
  if (unit === "lac" || unit === "lacs" || unit === "lakh" || unit === "lakhs" || unit === "l") return Math.round(base * 1e5);
  if (unit === "k") return Math.round(base * 1000);
  return Math.round(base);
}

export function formatSinglePrice(val, transactionType) {
  const n = Number(val);
  if (!n || isNaN(n) || n <= 0) return "";

  if (transactionType === "Rent") {
    if (n >= 1e7) {
      const cr = n / 1e7;
      return `₹${cr % 1 === 0 ? cr : cr.toFixed(2)} Cr`;
    }
    if (n >= 1e5) {
      const lacs = n / 1e5;
      return `₹${lacs % 1 === 0 ? lacs : lacs.toFixed(2)} Lac`;
    }
    return `₹${n.toLocaleString("en-IN")}`;
  }

  // Buy
  if (n >= 1e7) {
    const cr = n / 1e7;
    return `₹${cr % 1 === 0 ? cr : cr.toFixed(2)} Cr`;
  }
  if (n >= 1e5) {
    const lac = n / 1e5;
    return `₹${lac % 1 === 0 ? lac : lac.toFixed(2)} Lac`;
  }
  return `₹${n.toLocaleString("en-IN")}`;
}

export function parsePriceInput(raw, transactionType = "Buy") {
  if (raw === null || raw === undefined) {
    return { raw: "", numericValue: 0, numericMax: null, isRange: false, label: "" };
  }

  const str = String(raw).trim();
  if (!str) {
    return { raw: "", numericValue: 0, numericMax: null, isRange: false, label: "" };
  }

  // Check if string contains a range separator (" - ", "-", " to ", "–", "—")
  const rangeMatch = str.match(/^(.*?)\s*(?:[-–—]|\bto\b)\s*(.*?)$/i);

  if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
    const num1 = parseNumericToken(rangeMatch[1]);
    const num2 = parseNumericToken(rangeMatch[2]);

    if (num1 !== null && num2 !== null && num1 > 0 && num2 > 0) {
      const min = Math.min(num1, num2);
      const max = Math.max(num1, num2);
      const suffix = transactionType === "Rent" ? "/month" : "";
      const label = `${formatSinglePrice(min, transactionType)} - ${formatSinglePrice(max, transactionType)}${suffix}`;

      return {
        raw: str,
        numericValue: min,
        numericMax: max,
        isRange: true,
        label,
      };
    }
  }

  // Single value case
  const singleNum = parseNumericToken(str);
  if (singleNum !== null && singleNum > 0) {
    const suffix = transactionType === "Rent" ? "/month" : "";
    const label = `${formatSinglePrice(singleNum, transactionType)}${suffix}`;
    return {
      raw: str,
      numericValue: singleNum,
      numericMax: null,
      isRange: false,
      label,
    };
  }

  // Fallback: If user entered freeform text with custom characters (e.g. "₹6,000 - ₹60,000 negotiable")
  const anyNumbers = str.match(/\d[\d,]*(?:\.\d+)?/g);
  let fallbackNumeric = 0;
  if (anyNumbers && anyNumbers.length > 0) {
    fallbackNumeric = parseFloat(anyNumbers[0].replace(/,/g, "")) || 0;
  }

  let customLabel = str;
  if (!customLabel.includes("₹")) {
    customLabel = `₹${customLabel}`;
  }
  if (transactionType === "Rent" && !customLabel.toLowerCase().includes("month")) {
    customLabel = `${customLabel}/month`;
  }

  return {
    raw: str,
    numericValue: fallbackNumeric,
    numericMax: null,
    isRange: false,
    label: customLabel,
  };
}
