import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from "otplib";

const totp = new TOTP({
  crypto: new NobleCryptoPlugin(),
  base32: new ScureBase32Plugin(),
});

export function generateTotpSecret(): string {
  return totp.generateSecret();
}

export async function verifyTotpToken(token: string, secret: string): Promise<boolean> {
  const result = await totp.verify(token, { secret });
  return result.valid;
}

export function generateTotpUri(email: string, secret: string): string {
  return totp.toURI({ label: email, issuer: "Formatio", secret });
}
