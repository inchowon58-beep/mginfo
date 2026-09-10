import { VendorAdBoard } from "@/components/VendorAdBoard";
import { YoutubeWatch } from "@/components/YoutubeWatch";
import type { AdVendor } from "@/lib/types";
import type { LiveVendorView } from "@/lib/vendor";
import { articleSlotSeed, ensureVendorSlots, splitVendorSlots } from "@/lib/vendor-slots";

export function ArticleBodySlots({
  html,
  keyword,
  vendor,
  listingVendors,
  registerUrl,
  showRecruit,
  postId,
  slug,
}: {
  html: string;
  keyword: string;
  vendor: LiveVendorView;
  listingVendors: AdVendor[];
  registerUrl?: string;
  showRecruit?: boolean;
  postId?: string;
  slug?: string;
}) {
  const seed = articleSlotSeed(keyword, postId, slug);
  const ranked = listingVendors;
  const segments = splitVendorSlots(ensureVendorSlots(html));
  return (
    <div className="article-body">
      {segments.map((segment, index) => {
        if (segment.html) {
          return <div className="article-chunk" key={`html-${index}`} dangerouslySetInnerHTML={{ __html: segment.html }} />;
        }
        if (segment.slot === "youtube-mid" && vendor.youtubeIds[0]) {
          return (
            <YoutubeWatch
              key={`yt-mid-${index}`}
              keyword={keyword}
              videoId={vendor.youtubeIds[0]}
              seed={seed}
              placement="mid"
            />
          );
        }
        if (segment.slot === "youtube-end" && vendor.youtubeIds[1]) {
          return (
            <YoutubeWatch
              key={`yt-end-${index}`}
              keyword={keyword}
              videoId={vendor.youtubeIds[1]}
              seed={seed}
              placement="end"
            />
          );
        }
        if (segment.slot === "ad-mid" && (ranked.length || showRecruit)) {
          return (
            <VendorAdBoard
              key={`ads-${index}`}
              keyword={keyword}
              vendors={ranked}
              registerUrl={registerUrl}
              showRecruit={showRecruit}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
