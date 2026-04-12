import { getAccessibleUserIds } from "@/app/actions/sharing";

const ASSISTANT_ALLOWLIST: ReadonlySet<string> = new Set([
  "0e6dbbc5-c905-401a-b974-3d5b35cbf329",
]);

export async function canUseAssistant(): Promise<boolean> {
  try {
    const accessible = await getAccessibleUserIds();
    return accessible.some((id) => ASSISTANT_ALLOWLIST.has(id));
  } catch {
    return false;
  }
}
