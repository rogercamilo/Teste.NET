export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length < 8)
    errors.push("Mínimo de 8 caracteres");
  if (!/[A-Z]/.test(password))
    errors.push("Pelo menos uma letra maiúscula");
  if (!/[a-z]/.test(password))
    errors.push("Pelo menos uma letra minúscula");
  if (!/[0-9]/.test(password))
    errors.push("Pelo menos um número");
  if (!/[^A-Za-z0-9]/.test(password))
    errors.push("Pelo menos um caractere especial (!@#$%^&* …)");

  return { valid: errors.length === 0, errors };
}

export function passwordErrorMessage(password: string): string | null {
  const { valid, errors } = validatePassword(password);
  return valid ? null : errors.join("; ");
}
