import { youtubeEmbedSrc } from "@/lib/youtube";
import { youtubeWatchCopy } from "@/lib/vendor-slots";

export function YoutubeWatch({
  keyword,
  videoId,
  seed,
  placement,
}: {
  keyword: string;
  videoId: string;
  seed: number;
  placement: "mid" | "end";
}) {
  return (
    <section className={`yt-watch is-${placement}`} aria-label="유튜브관련동영상 보기">
      <p className="yt-watch-kicker">유튜브관련동영상 보기</p>
      <p className="yt-watch-lead">{youtubeWatchCopy(keyword, seed, placement)}</p>
      <div className="yt-watch-frame">
        <iframe
          src={youtubeEmbedSrc(videoId)}
          title={`${keyword} 관련 유튜브`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </section>
  );
}
