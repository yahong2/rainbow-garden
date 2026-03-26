import React from "react";
import { Send, Sparkles } from "lucide-react";

/**
 * @param {Object} props
 * @param {Function} props.onClick - 버튼 클릭 핸들러
 * @param {string} props.variant - 디자인 타입 ('dreamy', 'pixel', 'jelly' → dreamy와 동일)
 * @param {string} [props.className] - 루트 래퍼 추가 클래스
 */
export default function SendButton({
  onClick,
  variant = "dreamy",
  className = "",
}) {
  const v = variant === "jelly" ? "dreamy" : variant;

  const DreamyStyle = (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-[35px] p-[2px] shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all active:scale-95"
    >
      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-purple-400 via-blue-400 to-pink-400" />

      <div className="relative flex items-center justify-between rounded-[33px] bg-slate-900/90 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-3 text-left sm:gap-4">
          <div className="relative shrink-0">
            <div className="absolute inset-0 opacity-50 blur-md transition-opacity group-hover:opacity-100 bg-purple-500" />
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-inner sm:h-12 sm:w-12">
              <Send
                size={22}
                className="transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:-rotate-12"
              />
            </div>
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-xs font-black leading-tight tracking-widest text-white sm:text-sm">
              오늘의 편지 보내기{" "}
              <Sparkles size={12} className="shrink-0 animate-pulse text-yellow-300" />
            </p>
            <p className="mt-1 text-[9px] font-medium text-slate-400 sm:text-[10px]">
              집사님의 진심을 풍선에 담아 하늘로 보내요
            </p>
          </div>
        </div>
        <div className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all group-hover:bg-white/20">
          <div className="h-1.5 w-1.5 animate-ping rounded-full bg-purple-400" />
        </div>
      </div>
    </button>
  );

  const PixelStyle = (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border-b-[6px] border-black/30 bg-[#3d2a7a] p-1 transition-all active:translate-y-1 active:border-b-0"
    >
      <div className="flex items-center gap-4 rounded-xl border-2 border-white/20 bg-indigo-900/40 p-4">
        <div className="flex h-12 w-12 items-center justify-center bg-white text-indigo-900 shadow-[4px_4px_0_rgba(0,0,0,0.2)]">
          <Send size={24} />
        </div>
        <div className="text-left font-mono">
          <p className="text-sm font-bold uppercase tracking-tighter text-white">
            Send Daily Letter
          </p>
          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-indigo-300">
            Saving to Memory Archive...
          </p>
        </div>
      </div>
    </button>
  );

  return (
    <div className={`w-full px-1 py-1 sm:px-2 ${className}`.trim()}>
      {v === "dreamy" ? DreamyStyle : PixelStyle}
    </div>
  );
}
