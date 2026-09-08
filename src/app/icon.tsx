import { ImageResponse } from "next/og";
import { getSiteIconSpec } from "@/lib/site-icon";
import { SiteIconMark } from "@/lib/site-icon-mark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<SiteIconMark spec={getSiteIconSpec()} size={32} />, size);
}
