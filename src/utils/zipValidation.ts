// src/utils/zipValidation.ts

interface ZipValidationResult {
  valid: boolean;
  suggestedState?: string; // state abbreviation
  message?: string;
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
