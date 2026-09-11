import { liveVendorView } from "../src/lib/vendor";
import { preferYoutubePair, youtubeIdsFromUrls } from "../src/lib/youtube";
import type { AdVendor, Post } from "../src/lib/types";

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

const POST_YT = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const POST_YT2 = "https://youtu.be/jNQXAC9IVRw";
const VENDOR_YT = "https://www.youtube.com/watch?v=9bZkp7q19f0";
const VENDOR_YT2 = "https://www.youtube.com/watch?v=3tmd-ClpJxA";

function post(over: Partial<Post> = {}): Post {
  return {
    id: "p1",
    slug: "sample",
    title: "제목",
    excerpt: "",
    bodyHtml: "",
    category: "life",
    tags: [],
    status: "published",
    publishedAt: null,
    createdAt: "",
    updatedAt: "",
    ...over,
  };
}

function vendor(over: Partial<AdVendor> = {}): AdVendor {
  return {
    id: "v1",
    name: "업체",
    createdAt: "",
    updatedAt: "",
    ...over,
  };
}

const postWins = liveVendorView(
  post({ youtubeUrl1: POST_YT, vendorId: "v1" }),
  vendor({ youtubeUrl1: VENDOR_YT, youtubeUrl2: VENDOR_YT2 })
);
assert(postWins.youtubeIds[0] === "dQw4w9WgXcQ", "post youtube wins slot 1 when vendor is linked");
assert(postWins.youtubeIds[1] === "9bZkp7q19f0", "remaining slot fills from vendor");
assert(postWins.youtubeUrl1 === "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "normalized post url");

const vendorFallback = liveVendorView(
  post({ vendorId: "v1" }),
  vendor({ youtubeUrl1: VENDOR_YT, youtubeUrl2: VENDOR_YT2 })
);
assert(vendorFallback.youtubeIds[0] === "9bZkp7q19f0", "empty post youtube uses vendor 1");
assert(vendorFallback.youtubeIds[1] === "3tmd-ClpJxA", "empty post youtube uses vendor 2");

const postBoth = liveVendorView(
  post({ youtubeUrl1: POST_YT, youtubeUrl2: POST_YT2, vendorId: "v1" }),
  vendor({ youtubeUrl1: VENDOR_YT, youtubeUrl2: VENDOR_YT2 })
);
assert(postBoth.youtubeIds.join(",") === "dQw4w9WgXcQ,jNQXAC9IVRw", "two post urls hide vendor youtube");

const noVendor = liveVendorView(post({ youtubeUrl1: POST_YT }));
assert(noVendor.youtubeIds[0] === "dQw4w9WgXcQ", "post youtube works without vendor");
assert(!noVendor.youtubeIds[1], "no second id when only one post url");

const keywordOverGroup = preferYoutubePair(
  { youtubeUrl1: POST_YT },
  { youtubeUrl1: VENDOR_YT, youtubeUrl2: VENDOR_YT2 }
);
assert(keywordOverGroup.youtubeIds[0] === "dQw4w9WgXcQ", "keyword youtube copied first");
assert(keywordOverGroup.youtubeIds[1] === "9bZkp7q19f0", "group fills remaining slot");

const groupOnly = preferYoutubePair({}, { youtubeUrl1: VENDOR_YT });
assert(groupOnly.youtubeUrl1 === "https://www.youtube.com/watch?v=9bZkp7q19f0", "keyword empty falls back to group");

assert(
  youtubeIdsFromUrls(POST_YT, POST_YT, VENDOR_YT).join(",") === "dQw4w9WgXcQ,9bZkp7q19f0",
  "duplicate ids are skipped"
);

console.log("youtube priority ok");
