import { revalidatePath } from "next/cache";

/** Bust public ISR after admin settings/content changes. */
export function revalidatePublicSite() {
  revalidatePath("/", "layout");
}
