export function getFormDataValue(
  formData: FormData | Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value =
    formData instanceof FormData ? formData.get(key) : formData?.[key];
  return typeof value === "string" ? value : undefined;
}
