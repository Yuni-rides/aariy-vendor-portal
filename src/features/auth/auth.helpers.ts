/** Accepts 03001234567, 0300 1234567, +92 300 1234567 or 923001234567. */
export const isValidPkMobile = (v: string) => /^(?:\+92|0092|92|0)?3\d{9}$/.test(v.replace(/[\s-]/g, ""));

/** Normalises a Pakistani mobile number to E.164 (+923001234567). */
export const toE164 = (v: string) => {
  const d = v.replace(/[\s-]/g, "").replace(/^(\+92|0092|92|0)/, "");
  return `+92${d}`;
};

/** "+923001234567" -> "0300 1234567" */
export const formatPkMobile = (e164: string) => {
  const d = e164.replace(/^\+92/, "0");
  return `${d.slice(0, 4)} ${d.slice(4)}`;
};

export const isValidEmailAddress = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

/** Seconds before "Send code again" is allowed. */
export const OTP_RESEND_SECONDS = 30;
export const OTP_LENGTH = 6;
