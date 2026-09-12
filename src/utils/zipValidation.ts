// src/utils/zipValidation.ts

interface ZipValidationResult {
  valid: boolean;
  suggestedState?: string; // state abbreviation
  message?: string;
}

/** 50 États US + DC (whitelist anti "Invalid state code" Printful). */
export const US_STATE_CODES = new Set(
  (
    "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD " +
    "MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD " +
    "TN TX UT VT VA WA WV WI WY"
  ).split(" "),
);

/** Code state US valide (2 lettres, whitelist). */
export function isValidUSState(code: unknown): boolean {
  if (typeof code !== "string") return false;
  return US_STATE_CODES.has(code.trim().toUpperCase());
}

export async function validateUSZip(
  zip: string,
  state: string,
): Promise<ZipValidationResult> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!res.ok) {
      return { valid: false, message: "ZIP code not found. Please verify." };
    }
    const data = await res.json();
    const place = data.places?.[0];
    if (!place) {
      return { valid: false, message: "ZIP code not found. Please verify." };
    }
    const officialState = place["state abbreviation"];
    if (officialState.toUpperCase() !== state.toUpperCase()) {
      return {
        valid: true,
        suggestedState: officialState,
        message: `ZIP ${zip} is in ${place["place name"]}, ${officialState}. The state you entered (${state.toUpperCase()}) does not match.`,
      };
    }
    return { valid: true };
  } catch {
    // API unreachable → ne rien bloquer
    return { valid: true };
  }
}
