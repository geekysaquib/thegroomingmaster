const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const two = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : ""));
const three = (n) => (n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? " " : ""}` : "") + (n % 100 ? two(n % 100) : "");

/** 2625.5 -> "Rupees Two Thousand Six Hundred Twenty Five and Fifty Paise Only" (Indian lakh / crore system). */
export function rupeesInWords(amount) {
  const total = Math.round(Number(amount || 0) * 100);
  const rupees = Math.floor(total / 100), paise = total % 100;
  const parts = [];
  const crore = Math.floor(rupees / 1e7), lakh = Math.floor(rupees / 1e5) % 100, thousand = Math.floor(rupees / 1e3) % 100, rest = rupees % 1000;
  if (crore) parts.push(`${three(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (rest) parts.push(three(rest));
  return `Rupees ${parts.join(" ") || "Zero"}${paise ? ` and ${two(paise)} Paise` : ""} Only`;
}
