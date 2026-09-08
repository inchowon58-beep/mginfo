import { siteIconResponse } from "@/lib/site-icon";

export const size = { width: 32, height: 32 };
export const contentType = "image/svg+xml";

export default function Icon() {
  return siteIconResponse(32);
}
