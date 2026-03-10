import { hashForBreachCheck } from "@/encryption";

export async function checkPasswordBreach(password: string): Promise<number> {
  const hash = await hashForBreachCheck(password);
  const prefix = hash.substring(0, 5);
  const suffix = hash.substring(5);

  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { "Add-Padding": "true" },
  });

  if (!response.ok) return 0;

  const text = await response.text();
  const lines = text.split("\n");

  for (const line of lines) {
    const [hashSuffix, count] = line.split(":");
    if (hashSuffix.trim() === suffix) {
      return parseInt(count.trim(), 10);
    }
  }

  return 0;
}
