export function getFormDataValue(
  formData: FormData | undefined,
  key: string,
): string | undefined {
  const value = formData?.get(key);
  return typeof value === "string" ? value : undefined;
}
