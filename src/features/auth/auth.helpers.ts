/** Pakistani mobile: 03XXXXXXXXX, +923XXXXXXXXX, 923XXXXXXXXX (spaces/dashes ignored). */
export const isValidPkMobile = (v: string) => /^(?:\+92|0092|92|0)?3\d{9}$/.test(v.replace(/[\s-]/g, ""));

/** Normalises any accepted format to E.164, e.g. +923001234567. */
export const toE164 = (v: string) => {
  const digits = v.replace(/\D/g, "");
  return `+92${digits.slice(-10)}`;
};

/** +923001234567 → 0300 1234567 */
export const formatPkMobile = (e164: string) => {
  const local = `0${e164.replace(/\D/g, "").slice(-10)}`;
  return `${local.slice(0, 4)} ${local.slice(4)}`;
};

export const isValidEmailAddress = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export const MIN_PASSWORD_LENGTH = 8;

/** At least 8 characters with a letter and a number. Returns an error message or undefined. */
export const passwordProblem = (v: string): string | undefined => {
  if (v.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return "Use letters and at least one number.";
  return undefined;
};
