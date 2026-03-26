import React, { useEffect, useMemo, useRef, useState } from "react";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  deleteUser,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signOut,
} from "firebase/auth";
import {
  arrayUnion,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import html2canvas from "html2canvas";
import {
  Book,
  Camera,
  Check,
  ChevronLeft,
  Edit3,
  Gift,
  Globe,
  Info,
  Lock,
  Send,
  Share2,
  ShieldAlert,
  Sparkles,
  Unlock,
  User,
  X,
} from "lucide-react";

// ==========================================================
// DESIGN MODE (가짜 데이터로 UI 확인용)
// ==========================================================
const DESIGN_MODE =
  String(process.env.REACT_APP_DESIGN_MODE || "")
    .trim()
    .toLowerCase() === "true";

// --- Firebase Configuration (CRA env vars) ---
const firebaseConfig = (() => {
  const raw = process.env.REACT_APP_FIREBASE_CONFIG;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
})();

const app =
  !DESIGN_MODE && firebaseConfig
    ? getApps().length
      ? getApp()
      : initializeApp(firebaseConfig)
    : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId =
  process.env.REACT_APP_FIREBASE_APP_ID || "rainbow-garden-integrated-v3";

// --- Constants ---
const MAX_BALLOONS = 49;
const MAX_FREE_PHOTOS = 3;

const withTimeout = (promise, ms) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
};

// --- Animation Styles ---
const styleTag = `
@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }
@keyframes auraPulse {
  0%, 100% { transform: scale(1); opacity: 0.5; filter: blur(40px); }
  50% { transform: scale(1.2); opacity: 0.8; filter: blur(60px); }
}
@keyframes twinkle {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes balloonPop { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

.animate-float { animation: float 3s ease-in-out infinite; }
.animate-aura-pulse { animation: auraPulse 4s ease-in-out infinite; }
.animate-twinkle { animation: twinkle 2.5s ease-in-out infinite; }
.animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
.animate-slide-up { animation: slideUp 0.5s ease-out forwards; }
.animate-balloon-pop { animation: balloonPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
`;

const defaultData = {
  catConfig: { name: "", color: "#E67E22", pattern: "solid", whiteMixed: false },
  balloons: 0,
  memos: [],
  isSetupComplete: false,
  isGreetingShown: false,
};

const designModeData = {
  catConfig: { name: "삼색이", color: "#E67E22", pattern: "calico", whiteMixed: false },
  balloons: 5,
  memos: [{ id: 1, text: "집사야 반가워!", date: "2026-03-25", isPublic: true }],
  isSetupComplete: true,
  isGreetingShown: true,
};

// --- Components ---

const StarField = ({ count = 30 }) => {
  const stars = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 80}%`,
      size: `${1 + Math.random() * 2}px`,
      delay: `${Math.random() * 5}s`,
      duration: `${2 + Math.random() * 3}s`,
    }));
  }, [count]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {stars.map((star) => (
        <span
          key={star.id}
          className="absolute rounded-full bg-white animate-twinkle shadow-[0_0_5px_white]"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            animationDelay: star.delay,
            animationDuration: star.duration,
          }}
        />
      ))}
    </div>
  );
};

const PixelCat = ({
  config,
  size = 100,
  isFloating = true,
  interactionMode = "none",
}) => {
  const { color, pattern, whiteMixed } = config;
  let animationClass = isFloating ? "animate-float" : "";
  if (interactionMode === "sleeping") animationClass = "animate-float";

  return (
    <div
      className={`${animationClass} transition-all duration-300 origin-center relative`}
      style={{ width: size, height: size }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 20 20"
        className="drop-shadow-2xl overflow-visible"
      >
        <rect
          x="4"
          y="2"
          width="3"
          height="3"
          fill={pattern === "calico" ? "#FFFFFF" : color}
        />
        <rect
          x="13"
          y="2"
          width="3"
          height="3"
          fill={pattern === "calico" ? "#FFFFFF" : color}
        />
        <rect
          x="5"
          y="4"
          width="10"
          height="10"
          fill={pattern === "calico" ? "#FFFFFF" : color}
        />
        {whiteMixed && pattern !== "calico" && (
          <>
            <rect x="7" y="10" width="6" height="4" fill="#FFFFFF" />
            <rect x="5" y="13" width="2" height="1" fill="#FFFFFF" />
            <rect x="13" y="13" width="2" height="1" fill="#FFFFFF" />
            <rect x="8" y="8" width="4" height="2" fill="#FFFFFF" />
          </>
        )}
        {pattern === "tabby" && (
          <>
            <rect x="7" y="4" width="1" height="2" fill="rgba(0,0,0,0.2)" />
            <rect x="9" y="4" width="2" height="3" fill="rgba(0,0,0,0.2)" />
            <rect x="12" y="4" width="1" height="2" fill="rgba(0,0,0,0.2)" />
          </>
        )}
        {pattern === "tuxedo" && !whiteMixed && (
          <rect x="8" y="9" width="4" height="5" fill="white" />
        )}
        {pattern === "calico" && (
          <>
            <rect x="5" y="4" width="10" height="10" fill="#FFFFFF" />
            <rect x="4" y="2" width="3" height="3" fill={color} />
            <rect x="13" y="2" width="3" height="3" fill="#333333" />
            <rect x="5" y="4" width="4" height="4" fill={color} />
            <rect x="11" y="4" width="4" height="4" fill="#333333" />
            <rect x="5" y="10" width="3" height="4" fill="#333333" />
            <rect x="12" y="10" width="3" height="4" fill={color} />
            <rect x="15" y="10" width="3" height="2" fill="#333333" />
          </>
        )}
        <rect x="7" y="7" width="1" height="1" fill="#000000" />
        <rect x="12" y="7" width="1" height="1" fill="#000000" />
        <rect x="9" y="9" width="2" height="1" fill="#FFB6C1" />
        {pattern !== "calico" && (
          <rect x="15" y="10" width="3" height="2" fill={color} />
        )}
      </svg>
    </div>
  );
};

const Balloon = ({ index }) => {
  const colors = [
    "#FF8E8E",
    "#FFB570",
    "#FFF47D",
    "#91FF8E",
    "#7DFFFF",
    "#7D9BFF",
    "#B07DFF",
    "#FF7DED",
  ];
  const color = colors[index % colors.length];
  const x = (index % 6) * 14 - 35;
  const y = -Math.floor(index / 6) * 18;
  return (
    <div
      className="absolute transition-all duration-1000 animate-balloon-pop"
      style={{ transform: `translate(${x}px, ${y}px)` }}
    >
      <div className="w-[1px] h-12 bg-white/40 absolute left-1/2 top-5 -translate-x-1/2" />
      <div
        className="w-6 h-7 rounded-full shadow-xl relative"
        style={{
          backgroundColor: color,
          border: "1.5px solid rgba(255,255,255,0.6)",
        }}
      >
        <div className="w-2 h-2.5 bg-white/40 rounded-full absolute top-1 left-1.5" />
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(DESIGN_MODE ? designModeData : defaultData);

  const [activeModal, setActiveModal] = useState(null);
  const [newMemo, setNewMemo] = useState("");
  const [memoPhoto, setMemoPhoto] = useState(null);
  const [memoPrivacy, setMemoPrivacy] = useState("public");
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const [altitudeDelta, setAltitudeDelta] = useState(null);
  const [libraryTab, setLibraryTab] = useState("all");
  const [storyPage, setStoryPage] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [sleepMinutes, setSleepMinutes] = useState(30);
  const [selectedTrack] = useState({
    title: "무지개동산",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  });

  const gardenRef = useRef(null);
  const audioRef = useRef(null);
  const sleepTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastBalloonsRef = useRef(data.balloons || 0);

  useEffect(() => {
    if (DESIGN_MODE) return;
    if (!auth || !db) return;

    let unsubscribeDoc = null;
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const userDocRef = doc(db, "artifacts", appId, "users", u.uid);

        // Create doc only for new users (avoid overwriting isSetupComplete)
        const existing = await getDoc(userDocRef);
        if (!existing.exists()) await setDoc(userDocRef, defaultData);

        unsubscribeDoc = onSnapshot(userDocRef, (snap) => {
          if (!snap.exists()) return;
          const d = snap.data();
          setData((prev) => ({
            ...prev,
            ...d,
            memos: d.memos || [],
          }));
        });
      } else {
        await signInAnonymously(auth);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const prev = lastBalloonsRef.current;
    const next = data.balloons || 0;
    if (next > prev) {
      setAltitudeDelta((next - prev) * 100);
      setTimeout(() => setAltitudeDelta(null), 1400);
    }
    lastBalloonsRef.current = next;
  }, [data.balloons]);

  const handlePlayPause = async () => {
    if (!audioRef.current) return;
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              sleepTimerRef.current = setTimeout(() => {
                setIsPlaying(false);
                if (audioRef.current) audioRef.current.pause();
              }, sleepMinutes * 60 * 1000);
            })
            .catch(() => alert("음악을 재생할 수 없습니다."));
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  };

  const handleAddMemo = async () => {
    if (isSavingMemo) return;
    if (!newMemo.trim()) return;
    if (!DESIGN_MODE && (!user || !db)) return;
    const today = new Date().toLocaleDateString();
    if ((data.memos || []).some((m) => m.date === today)) {
      alert("오늘은 이미 풍선을 보냈어요. 내일 다시 만나요.");
      return;
    }
    setIsSavingMemo(true);
    const memo = {
      id: Date.now(),
      text: newMemo,
      date: today,
      isPublic: memoPrivacy === "public",
      photoUrl: memoPhoto,
    };

    try {
      if (DESIGN_MODE) {
        setData((prev) => ({
          ...prev,
          memos: [...(prev.memos || []), memo],
          balloons: (prev.balloons || 0) + 1,
        }));
      } else {
        await withTimeout(
          updateDoc(doc(db, "artifacts", appId, "users", user.uid), {
            memos: arrayUnion(memo),
            balloons: (data.balloons || 0) + 1,
          }),
          15000
        );

        // Snapshot이 느리거나 실패하더라도 UX가 바로 반영되도록 로컬도 갱신
        setData((prev) => ({
          ...prev,
          memos: [...(prev.memos || []), memo],
          balloons: (prev.balloons || 0) + 1,
        }));
      }

      setNewMemo("");
      setMemoPhoto(null);
      setMemoPrivacy("public");
      setActiveModal("memo");
    } catch {
      alert("오류가 발생했습니다. 파이어베이스 설정을 확인해 주세요.");
    } finally {
      setIsSavingMemo(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("공유 링크가 복사되었습니다.");
    } catch {
      alert("복사에 실패했습니다. 주소창의 링크를 수동으로 복사해주세요.");
    }
  };

  const handleCapture = async () => {
    if (!gardenRef.current) return;
    setIsCapturing(true);
    setTimeout(async () => {
      const canvas = await html2canvas(gardenRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: null,
      });
      const link = document.createElement("a");
      link.download = `RainbowGarden_${data.catConfig.name || "cat"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setIsCapturing(false);
    }, 200);
  };

  const handleDeleteAll = async () => {
    const ok = window.confirm(
      "정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다."
    );
    if (!ok) return;

    if (DESIGN_MODE) {
      setData(designModeData);
      setActiveModal(null);
      return;
    }

    if (!user || !db || !auth) return;
    const userDocRef = doc(db, "artifacts", appId, "users", user.uid);
    try {
      await deleteDoc(userDocRef);
    } catch {
      // ignore
    }

    try {
      await deleteUser(user);
    } catch {
      try {
        await signOut(auth);
      } catch {
        // ignore
      }
    }

    window.location.reload();
  };

  const filteredMemos = useMemo(() => {
    const list = data.memos || [];
    if (libraryTab === "public") return list.filter((m) => m.isPublic);
    if (libraryTab === "private") return list.filter((m) => !m.isPublic);
    return list;
  }, [data.memos, libraryTab]);

  const skyStyle = useMemo(() => {
    const progress = (data.balloons || 0) / MAX_BALLOONS;
    if (progress < 0.2) return "from-slate-950 via-indigo-950 to-slate-900";
    if (progress < 0.6) return "from-indigo-600 via-purple-500 to-orange-300";
    return "from-sky-500 via-blue-300 to-emerald-50";
  }, [data.balloons]);

  if (!DESIGN_MODE && !firebaseConfig) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-white flex items-center justify-center p-8">
        <style>{styleTag}</style>
        <div className="max-w-lg w-full bg-white/5 border border-white/10 rounded-3xl p-8">
          <h1 className="text-xl font-black tracking-tight mb-3">
            Firebase 설정이 필요합니다
          </h1>
          <p className="text-sm text-white/70 leading-relaxed">
            `.env.local`에 `REACT_APP_FIREBASE_CONFIG`를 JSON 문자열로 넣어주세요.
            예시는 `.env.example`를 참고하면 됩니다.
          </p>
        </div>
      </div>
    );
  }

  if (!data.isSetupComplete || activeModal === "edit-profile") {
    const isFirstTime = !data.isSetupComplete;
    return (
      <div className="flex h-screen w-full bg-slate-50 items-center justify-center p-6 font-sans overflow-y-auto">
        <style>{styleTag}</style>
        <div className="bg-white p-10 rounded-[48px] shadow-2xl w-full max-w-sm flex flex-col items-center animate-fade-in relative my-auto">
          {!isFirstTime && (
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-8 right-8 p-2 text-slate-300"
            >
              <X />
            </button>
          )}
          <h2 className="text-2xl font-black mb-1 tracking-tighter uppercase">
            {isFirstTime ? "Garden Entrance" : "Profile Edit"}
          </h2>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-8">
            49일간의 치유 여정 시작
          </p>
          <div className="bg-slate-50 w-36 h-36 rounded-[40px] flex items-center justify-center mb-8 border-4 border-white shadow-inner">
            <PixelCat config={data.catConfig} size={90} isFloating={false} />
          </div>
          <div className="w-full space-y-5 mb-8">
            <div className="space-y-1">
              <p className="text-[11px] font-black text-slate-400 ml-1">
                아이 이름
              </p>
              <input
                type="text"
                className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-center font-bold outline-none ring-2 ring-slate-100 focus:ring-indigo-300 transition-all text-slate-800"
                placeholder="이름을 입력하세요"
                value={data.catConfig.name}
                onChange={(e) =>
                  setData((p) => ({
                    ...p,
                    catConfig: { ...p.catConfig, name: e.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">
                털 색상 &amp; 무늬
              </p>
              <div className="grid grid-cols-5 gap-3">
                {["#333", "#888", "#E67E22", "#F5F5F5", "#5D4037"].map((c) => (
                  <button
                    key={c}
                    onClick={() =>
                      setData((p) => ({
                        ...p,
                        catConfig: { ...p.catConfig, color: c },
                      }))
                    }
                    className={`w-8 h-8 rounded-full border-4 transition-all ${
                      data.catConfig.color === c
                        ? "border-indigo-400 scale-110"
                        : "border-white"
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`color-${c}`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {["solid", "tabby", "calico", "tuxedo"].map((p) => (
                  <button
                    key={p}
                    onClick={() =>
                      setData((prev) => ({
                        ...prev,
                        catConfig: {
                          ...prev.catConfig,
                          pattern: p,
                          whiteMixed:
                            p === "calico" ? false : prev.catConfig.whiteMixed,
                        },
                      }))
                    }
                    className={`py-2.5 rounded-xl text-[10px] font-black border-2 transition-all ${
                      data.catConfig.pattern === p
                        ? "bg-indigo-500 text-white border-indigo-500 shadow-md"
                        : "bg-slate-50 text-slate-400 border-slate-100"
                    }`}
                  >
                    {p === "solid"
                      ? "단색"
                      : p === "tabby"
                        ? "태비"
                        : p === "calico"
                          ? "삼색이"
                          : "턱시도"}
                  </button>
                ))}
              </div>
              {data.catConfig.pattern !== "calico" && (
                <button
                  onClick={() =>
                    setData((prev) => ({
                      ...prev,
                      catConfig: {
                        ...prev.catConfig,
                        whiteMixed: !prev.catConfig.whiteMixed,
                      },
                    }))
                  }
                  className={`w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 border-2 transition-all font-black text-xs ${
                    data.catConfig.whiteMixed
                      ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm"
                      : "bg-white border-slate-100 text-slate-400"
                  }`}
                >
                  <Sparkles size={14} /> 하얀 가슴/양말 포인트
                </button>
              )}
            </div>
          </div>
          <button
            disabled={!data.catConfig.name || (!DESIGN_MODE && (!user || !db))}
            onClick={async () => {
              const update = { ...data, isSetupComplete: true };
              setData(update);
              setActiveModal(isFirstTime ? "story" : null);
            }}
            className="w-full bg-indigo-500 disabled:opacity-50 text-white py-5 rounded-[28px] font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all"
          >
            무지개동산으로 출발하기
          </button>
        </div>
      </div>
    );
  }

  if (activeModal === "story") {
    const storyTexts = [
      "“집사야 나, 아직 완전히 떠난 건 아니야.”",
      "“49일 동안은… 너의 곁에 있을게.”",
      "“나에게 메시지를 보내주면, 풍선을 타고 집사 꿈속으로 찾아갈게.”",
    ];
    return (
      <div className="flex h-screen w-full bg-slate-950 items-center justify-center p-8 text-white text-center font-sans">
        <style>{styleTag}</style>
        <div className="max-w-sm animate-fade-in flex flex-col items-center">
          <PixelCat config={data.catConfig} size={140} />
          <p className="text-xl font-bold leading-relaxed my-12 tracking-tight">
            {storyTexts[storyPage]}
          </p>
          <div className="flex gap-2 mb-10">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === storyPage ? "w-8 bg-indigo-400" : "w-2 bg-white/20"
                }`}
              />
            ))}
          </div>
          <button
            onClick={() =>
              storyPage < 2 ? setStoryPage(storyPage + 1) : setActiveModal(null)
            }
            className="bg-white text-slate-950 px-12 py-4 rounded-full font-black text-sm active:scale-95 transition-all"
          >
            다음 이야기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-screen w-full flex flex-col bg-gradient-to-b ${skyStyle} overflow-hidden font-sans text-white relative`}
    >
      <style>{styleTag}</style>
      <audio ref={audioRef} src={selectedTrack.src} loop />

      <div ref={gardenRef} className="relative flex-1 select-none">
        {!isCapturing && (
          <div className="absolute top-10 left-6 right-6 flex justify-between items-start z-50">
            <div className="relative">
              <div className="bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/30 shadow-lg flex items-center gap-2">
                <Globe size={14} />
                <span className="text-[13px] font-black uppercase tracking-tight">
                  {data.catConfig.name}
                </span>
                <span className="text-[11px] font-black text-white/70 tracking-tight">
                  {(data.balloons || 0) * 100}m
                </span>
              </div>
              {altitudeDelta ? (
                <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[11px] font-black text-white bg-indigo-500/80 border border-white/20 px-3 py-1.5 rounded-full shadow-lg animate-slide-up">
                  +{altitudeDelta}m
                </div>
              ) : null}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="p-3 bg-white/20 backdrop-blur-md rounded-full shadow-lg border border-white/30"
                aria-label="share"
              >
                <Share2 size={18} />
              </button>
              <button
                onClick={handleCapture}
                className="p-3 bg-white/20 backdrop-blur-md rounded-full shadow-lg border border-white/30"
                aria-label="capture"
              >
                <Camera size={18} />
              </button>
              <button
                onClick={() => setActiveModal("account")}
                className="p-3 bg-white/20 backdrop-blur-md rounded-full shadow-lg border border-white/30"
                aria-label="account"
              >
                <User size={18} />
              </button>
            </div>
          </div>
        )}

        <div className="absolute left-6 top-1/4 bottom-1/4 w-1 bg-white/10 rounded-full flex flex-col items-center">
          <div
            className="absolute bottom-0 w-full bg-indigo-400 transition-all duration-1000"
            style={{ height: `${((data.balloons || 0) / MAX_BALLOONS) * 100}%` }}
          >
            <div className="absolute -top-1 w-3 h-3 bg-white rounded-full -left-1 shadow-[0_0_10px_white]" />
          </div>
          <div className="absolute -left-2 -bottom-6 text-[9px] font-black uppercase tracking-tighter opacity-50">
            49D Journey
          </div>
          <div className="absolute -left-1 top-[-22px] text-[10px] font-black tracking-tight text-white/50">
            {(data.balloons || 0) * 100}m
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 bottom-[140px] flex flex-col items-center">
          <div className="relative mb-8 h-12 flex items-center justify-center text-indigo-200">
            {(data.memos || []).map((_, i) => (
              <Balloon key={i} index={i} />
            ))}
          </div>
          <PixelCat
            config={data.catConfig}
            size={120}
            interactionMode={
              activeModal === "sleep" && isPlaying ? "sleeping" : "none"
            }
          />
          {(data.balloons || 0) === 0 && (
            <div className="mt-4 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-2xl text-[11px] font-bold animate-pulse">
              풍선을 보내면 여정이 시작됩니다
            </div>
          )}
        </div>
        <div
          className={`absolute bottom-0 w-full h-32 transition-all duration-[3000ms] ${
            (data.balloons || 0) > 20 ? "bg-emerald-500" : "bg-slate-900"
          }`}
          style={{
            transform: (data.balloons || 0) > 10 ? "translateY(100%)" : "translateY(0)",
          }}
        />
      </div>

      <div className="h-28 bg-[#0a0a1a] border-t border-white/5 flex items-center justify-around px-6 z-[100] pb-4 font-black text-white/30">
        <button
          onClick={() => {
            setLibraryTab("all");
            setActiveModal("library");
          }}
          className={`flex flex-col items-center transition-colors ${
            activeModal === "library" ? "text-indigo-400" : ""
          }`}
        >
          <Book size={24} />
          <span className="text-[9px] mt-1 uppercase tracking-widest">
            Archive
          </span>
        </button>
        <button
          onClick={() => setActiveModal("sleep")}
          className={`flex flex-col items-center transition-colors ${
            activeModal === "sleep" ? "text-indigo-400" : ""
          }`}
        >
          <Sparkles size={24} />
          <span className="text-[9px] mt-1 uppercase tracking-widest">Sleep</span>
        </button>

        <button
          onClick={() => setActiveModal("memo")}
          className={`flex flex-col items-center transition-all ${
            activeModal === "memo"
              ? "text-indigo-400 scale-110"
              : "text-indigo-300"
          }`}
        >
          <div className="bg-indigo-500 p-3 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.5)] -translate-y-4 border-2 border-white/20 active:scale-90 transition-transform">
            <Send size={28} className="text-white" />
          </div>
          <span className="text-[9px] uppercase tracking-widest -mt-2">
            Send
          </span>
        </button>

        <button
          onClick={() => setActiveModal("store")}
          className={`flex flex-col items-center transition-colors ${
            activeModal === "store" ? "text-indigo-400" : ""
          }`}
        >
          <Gift size={24} />
          <span className="text-[9px] mt-1 uppercase tracking-widest">Shop</span>
        </button>
      </div>

      {activeModal === "sleep" && (
        <SleepPlayerModal
          data={data}
          selectedTrack={selectedTrack}
          isPlaying={isPlaying}
          sleepMinutes={sleepMinutes}
          setSleepMinutes={setSleepMinutes}
          handlePlayPause={handlePlayPause}
          setActiveModal={setActiveModal}
          openLibrary={() => {
            setLibraryTab("all");
            setActiveModal("library");
          }}
          openMemo={() => setActiveModal("memo")}
          openStore={() => setActiveModal("store")}
        />
      )}

      {activeModal === "library" && (
        <div className="fixed inset-0 z-[2000] bg-slate-50 flex flex-col text-slate-800 animate-fade-in font-sans">
          <div className="h-24 flex items-center justify-between px-10 bg-white border-b shadow-sm font-black text-xl uppercase tracking-tighter">
            Memory Archive
            <button
              onClick={() => setActiveModal(null)}
              className="p-3 bg-slate-100 rounded-full text-slate-400"
              aria-label="close"
            >
              <X />
            </button>
          </div>
          <div className="bg-white flex px-6 py-2 gap-2 border-b">
            {["all", "public", "private"].map((tab) => (
              <button
                key={tab}
                onClick={() => setLibraryTab(tab)}
                className={`flex-1 py-3 rounded-2xl text-[11px] font-black transition-all ${
                  libraryTab === tab
                    ? "bg-indigo-500 text-white shadow-md"
                    : "text-slate-400"
                }`}
              >
                {tab === "all" ? "전체" : tab === "public" ? "공개" : "숨김"}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-6 pb-40">
            {filteredMemos.length === 0 ? (
              <div className="py-20 text-center text-slate-300 font-bold">
                남긴 기록이 없습니다.
              </div>
            ) : (
              [...filteredMemos].reverse().map((m) => (
                <div
                  key={m.id}
                  className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 animate-slide-up"
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">
                      {m.date}
                    </span>
                    <Unlock size={14} className="text-indigo-400" />
                  </div>
                  <p className="text-slate-700 italic text-sm leading-relaxed mb-4">
                    "{m.text}"
                  </p>
                  {m.photoUrl && (
                    <img
                      src={m.photoUrl}
                      className="w-full rounded-2xl shadow-sm border"
                      alt="Memory"
                    />
                  )}
                </div>
              ))
            )}
          </div>
          <div className="absolute bottom-10 left-0 right-0 px-10">
            <button
              onClick={() => setActiveModal("memo")}
              className="w-full bg-indigo-500 text-white py-5 rounded-[28px] font-black shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-transform"
            >
              <Send size={20} /> 풍선 보내기
            </button>
          </div>
        </div>
      )}

      {activeModal === "memo" && (
        <div className="fixed inset-0 z-[2000] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in text-slate-800 font-sans">
          <div className="bg-white w-full max-w-sm rounded-[56px] p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-xl tracking-tight">오늘의 인사</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-300 hover:text-slate-500 transition-colors"
                aria-label="close"
              >
                <X />
              </button>
            </div>
            <p className="text-[12px] font-bold text-indigo-500 mb-6 leading-relaxed bg-indigo-50 p-4 rounded-3xl border border-indigo-100 animate-pulse">
              "집사야, 메시지를 보내주면 나는 그 풍선을 타고 집사 꿈속으로 찾아갈게."
            </p>

            <textarea
              autoFocus
              className="w-full h-40 p-6 bg-slate-50 rounded-[32px] outline-none mb-6 font-medium leading-relaxed border-none focus:ring-4 focus:ring-indigo-50 transition-all"
              placeholder="아이에게 전할 말을 적어주세요..."
              value={newMemo}
              onChange={(e) => setNewMemo(e.target.value)}
            />

            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300 overflow-hidden border-2 border-dashed border-slate-200 active:scale-90 transition-transform"
                aria-label="photo"
              >
                {memoPhoto ? (
                  <img
                    src={memoPhoto}
                    className="w-full h-full object-cover"
                    alt="preview"
                  />
                ) : (
                  <Camera size={24} />
                )}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const photoCount = (data.memos || []).filter(
                    (m) => m.photoUrl
                  ).length;
                  if (photoCount >= MAX_FREE_PHOTOS) {
                    alert(
                      `사진은 최대 ${MAX_FREE_PHOTOS}장까지만 무료로 가능합니다.`
                    );
                    return;
                  }
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => setMemoPhoto(ev.target.result);
                  reader.readAsDataURL(file);
                }}
              />
              <div className="flex flex-col">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">
                  Photo (
                  {(data.memos || []).filter((m) => m.photoUrl).length}/
                  {MAX_FREE_PHOTOS})
                </p>
                <p className="text-[9px] text-slate-300 font-bold">
                  사진은 최대 3장까지 무료입니다
                </p>
              </div>
            </div>

            <div className="mb-6 text-left">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-tighter mb-2">
                공개 설정
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMemoPrivacy("public")}
                  className={`py-3 rounded-2xl border-2 font-black text-[11px] flex items-center justify-center gap-2 transition-all ${
                    memoPrivacy === "public"
                      ? "bg-indigo-500 text-white border-indigo-500 shadow-sm"
                      : "bg-slate-50 text-slate-400 border-slate-100"
                  }`}
                >
                  <Unlock size={14} /> 모두 공개
                </button>
                <button
                  type="button"
                  onClick={() => setMemoPrivacy("private")}
                  className={`py-3 rounded-2xl border-2 font-black text-[11px] flex items-center justify-center gap-2 transition-all ${
                    memoPrivacy === "private"
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-slate-50 text-slate-400 border-slate-100"
                  }`}
                >
                  <Lock size={14} /> 나만 보기
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-8 text-[10px] text-slate-400 font-bold bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <Info size={12} className="text-slate-300" />
              이 치유의 여정은 49일 동안 이어집니다
            </div>

            <button
              onClick={handleAddMemo}
              disabled={isSavingMemo || !newMemo.trim()}
              className="w-full bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-5 rounded-[28px] font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <Send size={20} /> {isSavingMemo ? "전송 중..." : "하늘로 풍선 보내기"}
            </button>
          </div>
        </div>
      )}

      {activeModal === "store" && (
        <div className="fixed inset-0 z-[2000] bg-white flex flex-col animate-fade-in text-slate-800 font-sans">
          <div className="h-24 flex items-center justify-between px-10 border-b shadow-sm font-black text-xl uppercase tracking-tighter">
            Memorial Shop
            <button
              onClick={() => setActiveModal(null)}
              className="p-3 bg-slate-100 rounded-full text-slate-400"
              aria-label="close"
            >
              <X />
            </button>
          </div>
          <div className="flex-1 p-8 space-y-6">
            <div className="bg-indigo-600 p-8 rounded-[40px] text-white shadow-xl shadow-indigo-100">
              <h4 className="text-xl font-black mb-2 tracking-tight">
                기억의 책 (Digital PDF)
              </h4>
              <p className="text-sm opacity-80 mb-6 font-medium leading-relaxed">
                49일간의 여정을 아름다운 PDF로 소장하세요.
              </p>
              <button className="bg-white text-indigo-600 px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-lg">
                신청하기 ($4.99)
              </button>
            </div>
            <div className="p-6 bg-slate-50 rounded-[32px] border-2 border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm">
                <Globe size={24} />
              </div>
              <div className="flex-1">
                <h5 className="font-black text-sm text-slate-800">
                  글로벌 도네이션
                </h5>
                <p className="text-[10px] text-slate-400 font-medium">
                  수익금의 일부를 보호소에 기부합니다.
                </p>
              </div>
              <div className="p-2 bg-indigo-100 rounded-full text-indigo-500">
                <Check size={16} />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === "account" && (
        <div className="fixed inset-0 z-[2000] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-6 text-slate-800 font-sans">
          <div className="bg-white w-full max-w-sm rounded-[56px] p-10 shadow-2xl animate-fade-in text-center">
            <h3 className="font-black text-xl mb-8 uppercase tracking-tighter">
              Settings
            </h3>
            <div className="space-y-4">
              <button
                onClick={() => setActiveModal("edit-profile")}
                className="w-full bg-slate-50 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <Edit3 size={18} /> 아이 정보 수정
              </button>
              <div className="pt-8 border-t border-slate-100 mt-4">
                <button
                  onClick={handleDeleteAll}
                  className="text-rose-300 font-black text-[10px] flex items-center justify-center gap-2 mx-auto uppercase tracking-widest"
                >
                  <ShieldAlert size={12} /> Delete All Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SleepPlayerModal = ({
  data,
  selectedTrack,
  isPlaying,
  sleepMinutes,
  setSleepMinutes,
  handlePlayPause,
  setActiveModal,
  openLibrary,
  openMemo,
  openStore,
}) => {
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-[2500] bg-slate-950 animate-fade-in overflow-hidden font-sans select-none">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a] via-[#1a1a3a] to-[#2a1a4a]" />
      <StarField count={40} />

      <div className="absolute bottom-[-100px] left-[-20%] right-[-20%] h-[300px] bg-gradient-to-t from-transparent via-indigo-900/20 to-transparent blur-3xl" />
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500/20 via-yellow-500/20 via-green-500/20 via-blue-500/20 to-purple-500/20 blur-sm" />

      <div className="relative h-full flex flex-col">
        <div className="h-20 flex items-center justify-between px-6 pt-4">
          <button
            onClick={() => setActiveModal(null)}
            className="p-2 text-white/60"
            aria-label="back"
          >
            <ChevronLeft size={28} />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-black text-white tracking-tight uppercase">
              {selectedTrack.title}
            </h2>
            <p className="text-[11px] text-white/50 font-medium tracking-tight">
              잠들 때까지 내가 곁에 있을게
            </p>
          </div>
          <div className="w-10" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="relative mb-12 flex items-center justify-center">
            <div className="absolute w-40 h-40 rounded-full bg-orange-400/40 blur-[45px] animate-aura-pulse" />
            <div className="absolute w-56 h-56 rounded-full bg-orange-300/10 blur-[60px]" />
            <div className="relative z-10 scale-125">
              <PixelCat
                config={data.catConfig}
                size={140}
                interactionMode={isPlaying ? "sleeping" : "none"}
              />
            </div>
          </div>
          <div className="text-center mb-10">
            <h3 className="text-3xl font-black text-white tracking-tighter mb-1 uppercase">
              {data.catConfig.name || "아이"}
            </h3>
            <p className="text-indigo-200/80 text-sm font-bold">
              집사야, 오늘 같이 잘자
            </p>
          </div>
          <div className="w-full max-w-xs mb-8">
            <div className="flex justify-between text-[10px] text-white/40 font-bold mb-2 tracking-widest">
              <span>00:12</span>
              <span>{formatTime(sleepMinutes * 60)}</span>
            </div>
            <div className="relative h-1 bg-white/10 rounded-full">
              <div
                className="absolute h-full bg-indigo-400 rounded-full shadow-[0_0_10px_#818cf8]"
                style={{ width: `30%` }}
              />
              <div
                className="absolute w-3 h-3 bg-white rounded-full -top-1 shadow-lg"
                style={{ left: `calc(30% - 6px)` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 w-full max-w-xs mb-10 text-white">
            {[15, 30, 60, 120].map((m) => (
              <button
                key={m}
                onClick={() => setSleepMinutes(m)}
                className={`py-4 rounded-[20px] text-[12px] font-black transition-all border ${
                  sleepMinutes === m
                    ? "bg-indigo-500/80 border-indigo-400 shadow-[0_4px_20px_rgba(99,102,241,0.3)]"
                    : "bg-white/5 border-white/5 text-white/30"
                }`}
              >
                {m < 60 ? `${m}분` : `${m / 60}시간`}
              </button>
            ))}
          </div>
          <button
            onClick={handlePlayPause}
            className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl active:scale-90 transition-all mb-4"
            aria-label="play-pause"
          >
            {isPlaying ? (
              <div className="flex gap-2">
                <div className="w-2 h-7 bg-slate-900 rounded-full" />
                <div className="w-2 h-7 bg-slate-900 rounded-full" />
              </div>
            ) : (
              <div className="ml-1.5 w-0 h-0 border-y-[15px] border-y-transparent border-l-[22px] border-l-slate-900" />
            )}
          </button>
          <p className="text-[11px] text-white/40 font-bold tracking-tighter">
            {sleepMinutes}분 후 자동 종료
          </p>
        </div>

        <div className="h-24 border-t border-white/5 bg-slate-950/50 backdrop-blur-md flex items-center justify-around px-8 pb-4">
          <button
            type="button"
            onClick={openLibrary}
            className="flex flex-col items-center opacity-30 hover:opacity-80 transition-opacity"
            aria-label="archive"
          >
            <Book size={24} />
            <span className="text-[9px] font-black mt-1 uppercase">ARCHIVE</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveModal("sleep")}
            className="flex flex-col items-center text-indigo-400"
            aria-label="sleep"
          >
            <Sparkles size={24} />
            <span className="text-[9px] font-black mt-1 uppercase">SLEEP</span>
            <div className="w-4 h-1 bg-indigo-400 rounded-full mt-1" />
          </button>
          <button
            type="button"
            onClick={openMemo}
            className="flex flex-col items-center opacity-30 hover:opacity-80 transition-opacity"
            aria-label="send"
          >
            <Send size={24} />
            <span className="text-[9px] font-black mt-1 uppercase">Send</span>
          </button>
          <button
            type="button"
            onClick={openStore}
            className="flex flex-col items-center opacity-30 hover:opacity-80 transition-opacity"
            aria-label="shop"
          >
            <Gift size={24} />
            <span className="text-[9px] font-black mt-1 uppercase">SHOP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
