import { siteIconResponse } from "@/lib/site-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/svg+xml";

export default function AppleIcon() {
  return siteIconResponse(180);
}
