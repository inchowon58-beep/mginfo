import { ImageResponse } from "next/og";
import { getSiteIconSpec } from "@/lib/site-icon";
import { SiteIconMark } from "@/lib/site-icon-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<SiteIconMark spec={getSiteIconSpec()} size={180} />, size);
}
