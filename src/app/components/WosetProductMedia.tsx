import { useState } from "react";
import { WosetArtwork, type WosetScene } from "./WosetArtwork";

/** Keep a local illustration visible until a product photo/video has loaded. */
export function WosetProductMedia({ source, title, scene }: { source: string; title: string; scene: WosetScene }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const video = /\.(mp4|webm)(?:[?#]|$)/i.test(source);
  const mediaClass = `absolute inset-0 h-full w-full object-contain p-4 ${ready ? "opacity-100" : "opacity-0"}`;
  return (
    <div className="relative h-full w-full">
      {!ready && <WosetArtwork scene={scene} className="absolute inset-0 h-full w-full p-4" />}
      {!failed && (video
        ? <video src={source} aria-label={title} className={mediaClass} autoPlay loop muted playsInline onLoadedData={() => setReady(true)} onError={() => { setReady(false); setFailed(true); }} />
        : <img src={source} alt={title} className={mediaClass} onLoad={() => setReady(true)} onError={() => { setReady(false); setFailed(true); }} />)}
    </div>
  );
}
