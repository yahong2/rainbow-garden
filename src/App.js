import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import "./App.css";
import SendButton from "./components/SendButton";
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
@keyframes riseFromBelow {
  from { transform: translateY(88px); opacity: 0.85; }
  to { transform: translateY(0); opacity: 1; }
}

.animate-float { animation: float 3s ease-in-out infinite; }
.animate-aura-pulse { animation: auraPulse 4s ease-in-out infinite; }
.animate-twinkle { animation: twinkle 2.5s ease-in-out infinite; }
.animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
.animate-slide-up { animation: slideUp 0.5s ease-out forwards; }
.animate-balloon-pop { animation: balloonPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
.animate-rise-first { animation: riseFromBelow 2.2s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
`;

const defaultData = {
  catConfig: { name: "", color: "#E67E22", pattern: "solid", whiteMixed: false },
  balloons: 0,
  memos: [],
  isSetupComplete: false,
  isGreetingShown: false,
};

/** 디자인 모드: 온보딩(설정→첫메시지) 테스트용 기본값 */
const designModeData = {
  catConfig: { name: "", color: "#E67E22", pattern: "solid", whiteMixed: false },
  balloons: 0,
  memos: [],
  isSetupComplete: false,
  isGreetingShown: false,
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
  fill = false,
  className = "",
}) => {
  const { color, pattern, whiteMixed } = config;
  let animationClass = isFloating ? "animate-float" : "";
  if (interactionMode === "sleeping") animationClass = "animate-float";

  return (
    <div
      className={`${animationClass} transition-all duration-300 origin-center relative ${className}`}
      style={fill ? { width: "100%", height: "100%" } : { width: size, height: size }}
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

const BALLOON_COLORS = [
  "#FF8E8E",
  "#FFB570",
  "#FFF47D",
  "#91FF8E",
  "#7DFFFF",
  "#7D9BFF",
  "#B07DFF",
  "#FF7DED",
];

const randomRainbowBalloonColor = () =>
  BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];

/** 메모 1개 = 풍선 1개; color는 전송 시 무지개 팔레트에서 랜덤 저장 */
const Balloon = ({ index, color }) => {
  const c =
    color && typeof color === "string"
      ? color
      : BALLOON_COLORS[index % BALLOON_COLORS.length];
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
          backgroundColor: c,
          border: "1.5px solid rgba(255,255,255,0.6)",
        }}
      >
        <div className="w-2 h-2.5 bg-white/40 rounded-full absolute top-1 left-1.5" />
      </div>
    </div>
  );
};

const SPARKLE_X = [-7, -4, -1, 2, 5, 8, -5, 3, -2, 6, -8, 4];
const SPARKLE_TINTS = [
  "rgba(255,255,255,0.95)",
  "rgba(253,224,71,0.9)",
  "rgba(196,181,253,0.95)",
  "rgba(251,207,232,0.9)",
];

/** Send 직후: S자로 상승 + 꼬리 반짝, 종료 후 부모에서 말풍선 처리 */
const FlyingBalloonWithSparkles = ({ color }) => (
  <div className="relative flex flex-col items-center">
    <div className="w-[1px] h-12 bg-white/45 absolute left-1/2 top-5 -translate-x-1/2" />
    <div
      className="w-6 h-7 rounded-full shadow-xl relative z-[1]"
      style={{
        backgroundColor: color,
        border: "1.5px solid rgba(255,255,255,0.65)",
      }}
    >
      <div className="w-2 h-2.5 bg-white/45 rounded-full absolute top-1 left-1.5" />
    </div>
    <div className="balloon-sparkle-host" aria-hidden>
      {SPARKLE_X.map((sx, i) => (
        <span
          key={i}
          className="balloon-sparkle-pixel"
          style={{
            left: `calc(50% + ${sx}px)`,
            marginLeft: -1.5,
            animationDelay: `${i * 0.065}s`,
            backgroundColor: SPARKLE_TINTS[i % SPARKLE_TINTS.length],
            boxShadow: `0 0 2px ${SPARKLE_TINTS[i % SPARKLE_TINTS.length]}`,
          }}
        />
      ))}
    </div>
  </div>
);

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
  const [isCapturing, setIsCapturing] = useState(false);

  /** 0: 캐릭터·닉네임 설정 → 1: 첫 메시지 → 2: 답장 연출 → 3: 메인 동산 */
  const [step, setStep] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [sleepMinutes, setSleepMinutes] = useState(30);
  const [selectedTrack] = useState({
    title: "무지개동산",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  });

  const gardenRef = useRef(null);
  const audioRef = useRef(null);
  const purrAudioRef = useRef(null);
  const patAudioRef = useRef(null);
  const purrDelayTimerRef = useRef(null);
  const longPressPurrStartedRef = useRef(false);
  const pressDownAtRef = useRef(0);
  const lastQuickTapRef = useRef(0);
  const isPatPatAnimatingRef = useRef(false);
  const sleepTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastBalloonsRef = useRef(data.balloons || 0);
  const step2TimerRef = useRef(null);
  /** 0이면 비행 없음; 0이 아니면 해당 토큰으로 비행 중 */
  const [balloonFlyToken, setBalloonFlyToken] = useState(0);
  const [meowBubbleVisible, setMeowBubbleVisible] = useState(false);
  const [isCatPurring, setIsCatPurring] = useState(false);
  const [isPatPatAnimating, setIsPatPatAnimating] = useState(false);
  const [catHintDismissed, setCatHintDismissed] = useState(false);
  const [catHintFading, setCatHintFading] = useState(false);
  const [catHintIndex, setCatHintIndex] = useState(0);
  const meowBubbleTimerRef = useRef(null);
  const balloonFlyEndHandledRef = useRef(false);

  const stopCatPurr = useCallback(() => {
    setIsCatPurring(false);
    const el = purrAudioRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
  }, []);

  const startCatPurr = useCallback(() => {
    setIsCatPurring(true);
    const el = purrAudioRef.current;
    if (!el) return;
    el.volume = 0.88;
    const p = el.play();
    if (p !== undefined) p.catch(() => {});
  }, []);

  const triggerPatPat = useCallback(() => {
    if (isPatPatAnimatingRef.current) return;
    isPatPatAnimatingRef.current = true;
    setIsPatPatAnimating(true);
    const el = patAudioRef.current;
    if (el) {
      el.currentTime = 0;
      el.volume = 0.92;
      const p = el.play();
      if (p !== undefined) p.catch(() => {});
    }
    window.setTimeout(() => {
      isPatPatAnimatingRef.current = false;
      setIsPatPatAnimating(false);
    }, 1100);
  }, []);

  const clearPurrDelayTimer = useCallback(() => {
    if (purrDelayTimerRef.current) {
      clearTimeout(purrDelayTimerRef.current);
      purrDelayTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- 언마운트 시점 audio 정리
      const el = purrAudioRef.current;
      if (el) {
        el.pause();
        el.currentTime = 0;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- 언마운트 시점 pat 오디오 정리
      const pat = patAudioRef.current;
      if (pat) {
        pat.pause();
        pat.currentTime = 0;
      }
      clearPurrDelayTimer();
    };
  }, [clearPurrDelayTimer]);

  const handleBalloonFlyEnd = useCallback(() => {
    setBalloonFlyToken(0);
    setMeowBubbleVisible(true);
    if (meowBubbleTimerRef.current) clearTimeout(meowBubbleTimerRef.current);
    meowBubbleTimerRef.current = setTimeout(() => {
      setMeowBubbleVisible(false);
    }, 4200);
  }, []);

  useEffect(() => {
    return () => {
      if (meowBubbleTimerRef.current) clearTimeout(meowBubbleTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (catHintDismissed) return undefined;
    const t = window.setInterval(() => {
      setCatHintIndex((i) => (i + 1) % 2);
    }, 4500);
    return () => window.clearInterval(t);
  }, [catHintDismissed]);

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
    if (step === 2) return;
    if (!data.isSetupComplete) setStep(0);
    else if ((data.memos || []).length === 0) setStep(1);
    else setStep(3);
    // step은 연출(2) 중에는 위 분기를 건너뛰기 위해 의존성에 포함
    // eslint-disable-next-line react-hooks/exhaustive-deps -- memos 길이로 충분
  }, [data.isSetupComplete, data.memos?.length, step]);

  useEffect(() => {
    if (step !== 2) {
      if (step2TimerRef.current) {
        clearTimeout(step2TimerRef.current);
        step2TimerRef.current = null;
      }
      return;
    }
    step2TimerRef.current = setTimeout(() => {
      setStep(3);
      step2TimerRef.current = null;
    }, 5000);
    return () => {
      if (step2TimerRef.current) clearTimeout(step2TimerRef.current);
    };
  }, [step]);

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
      balloonColor: randomRainbowBalloonColor(),
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
      if (step === 1) {
        setStep(2);
        setActiveModal(null);
      } else {
        setActiveModal(null);
      }
      balloonFlyEndHandledRef.current = false;
      setBalloonFlyToken(Date.now());
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
      setData({ ...defaultData });
      setStep(0);
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

  /** 1~3일차: 전용 배경 이미지 (public/bg-day1-3.png) */
  const useDay1to3SkyImage = useMemo(() => {
    const b = data.balloons || 0;
    return b >= 1 && b <= 3;
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
            PROFILE EDIT
          </h2>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">
            캐릭터 및 닉네임 설정
          </p>
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
              try {
                if (!DESIGN_MODE && user && db) {
                  await setDoc(
                    doc(db, "artifacts", appId, "users", user.uid),
                    update,
                    { merge: true }
                  );
                }
                setData(update);
                if (isFirstTime) {
                  setStep(1);
                } else {
                  setActiveModal(null);
                  setStep((s) => (s < 2 ? 2 : s));
                }
              } catch {
                alert("저장에 실패했습니다. 파이어베이스 설정을 확인해 주세요.");
              }
            }}
            className="w-full bg-indigo-500 disabled:opacity-50 text-white py-5 rounded-[28px] font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all"
          >
            무지개동산으로 출발하기
          </button>
        </div>
      </div>
    );
  }

  const memosList = data.memos || [];
  const clusterBalloons = balloonFlyToken ? memosList.slice(0, -1) : memosList;
  const lastMemo = memosList.length > 0 ? memosList[memosList.length - 1] : null;
  const flyBalloonColor =
    lastMemo?.balloonColor ||
    BALLOON_COLORS[
      Math.max(0, memosList.length - 1) % BALLOON_COLORS.length
    ];

  return (
    <>
    {step >= 2 && (
    <div className="tamago-frame flex h-[100svh] max-h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-[#0c0618] text-white">
      <style>{styleTag}</style>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.05rem]">
        <div
          className={`relative flex min-h-0 flex-1 flex-col overflow-hidden [--header-stack:clamp(4.65rem,10.5vh,5.85rem)] ${
            useDay1to3SkyImage ? "bg-slate-950" : `bg-gradient-to-b ${skyStyle}`
          }`}
        >
      {useDay1to3SkyImage ? (
        <>
          <div
            aria-hidden
            className="absolute inset-0 z-0 min-h-full min-w-full bg-no-repeat"
            style={{
              backgroundImage: "url(/bg-day1-3.png)",
              backgroundSize: "cover",
              backgroundPosition: "bottom center",
              backgroundRepeat: "no-repeat",
            }}
          />
          <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/15 via-transparent to-black/25" />
        </>
      ) : (
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 z-0 min-h-full w-full bg-gradient-to-b ${skyStyle}`}
        />
      )}
      <audio ref={audioRef} src={selectedTrack.src} loop />
      <audio
        ref={purrAudioRef}
        src="/purring-cat.mp3"
        loop
        preload="auto"
        className="hidden"
        aria-hidden
      />
      <audio
        ref={patAudioRef}
        src="/cat-pat.mp3"
        preload="auto"
        className="hidden"
        aria-hidden
      />

      <div
        ref={gardenRef}
        className="relative z-[2] flex min-h-0 flex-1 flex-col overflow-hidden select-none"
      >
        {!isCapturing && (
          <>
            <div className="z-50 flex shrink-0 justify-between gap-2 px-3 pt-2.5 sm:px-5 sm:pt-3">
              <div className="relative flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <div className="flex min-w-0 max-w-full items-center gap-2 rounded-full border border-white/30 bg-white/20 px-4 py-2.5 shadow-lg backdrop-blur-md">
                  <Globe size={14} className="shrink-0" />
                  <span className="truncate text-[13px] font-black uppercase tracking-tight">
                    {data.catConfig.name}
                  </span>
                  <span className="shrink-0 text-[11px] font-black text-white/70">
                    {(data.balloons || 0) * 100}m
                  </span>
                </div>
                {step === 2 ? (
                  <div className="max-w-[14rem] animate-fade-in rounded-2xl bg-white px-3 py-2 text-left shadow-xl">
                    <p className="text-[11px] font-black leading-snug text-slate-800">
                      집사 나 떠오르고있어!
                    </p>
                  </div>
                ) : null}
                {altitudeDelta ? (
                  <div className="absolute -bottom-7 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/20 bg-indigo-500/80 px-3 py-1.5 text-[11px] font-black text-white shadow-lg animate-slide-up">
                    +{altitudeDelta}m
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={handleShare}
                  className="rounded-full border border-white/30 bg-white/20 p-3 shadow-lg backdrop-blur-md"
                  aria-label="share"
                >
                  <Share2 size={18} />
                </button>
                <button
                  onClick={handleCapture}
                  className="rounded-full border border-white/30 bg-white/20 p-3 shadow-lg backdrop-blur-md"
                  aria-label="capture"
                >
                  <Camera size={18} />
                </button>
                <button
                  onClick={() => setActiveModal("account")}
                  className="rounded-full border border-white/30 bg-white/20 p-3 shadow-lg backdrop-blur-md"
                  aria-label="account"
                >
                  <User size={18} />
                </button>
              </div>
            </div>
            <div className="flex shrink-0 justify-center gap-2 px-3 pb-1 pt-0">
              <button
                type="button"
                onClick={() => setActiveModal("store")}
                className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-bold text-white/85 backdrop-blur-sm active:scale-95"
              >
                간식
              </button>
              <button
                type="button"
                onClick={() => setActiveModal("memo")}
                className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-bold text-white/85 backdrop-blur-sm active:scale-95"
              >
                놀이
              </button>
              <button
                type="button"
                onClick={() => setActiveModal("sleep")}
                className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-bold text-white/85 backdrop-blur-sm active:scale-95"
              >
                쓰다듬기
              </button>
            </div>
          </>
        )}

        <div
          className="absolute left-4 top-[var(--header-stack)] bottom-[min(24vh,6.25rem)] w-1 rounded-full bg-white/10 sm:left-5 flex flex-col items-center"
          aria-hidden
        >
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

        <div className="rg-main-stage relative w-full overflow-hidden">
          <div className="absolute inset-0 flex min-h-0 flex-col items-center justify-center px-2 pb-1 pt-0 sm:px-3">
          <div className="relative mb-3 flex h-12 w-full max-w-[min(18rem,calc(100vw-2rem))] shrink-0 justify-center">
            {balloonFlyToken ? (
              <div
                key={balloonFlyToken}
                className="balloon-fly-s absolute left-1/2 top-0 z-[50] -translate-x-1/2"
                onAnimationEnd={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (balloonFlyEndHandledRef.current) return;
                  balloonFlyEndHandledRef.current = true;
                  handleBalloonFlyEnd();
                }}
              >
                <FlyingBalloonWithSparkles color={flyBalloonColor} />
              </div>
            ) : null}
            <div className="relative h-full w-0">
              {clusterBalloons.map((m, i) => (
                <Balloon
                  key={m.id ?? `b-${i}`}
                  index={i}
                  color={m.balloonColor}
                />
              ))}
            </div>
          </div>
          <div
            className={`relative z-10 shrink-0 ${
              step === 2 ? "animate-rise-first" : ""
            } ${meowBubbleVisible ? "translate-x-1.5" : ""}`}
            style={{
              width: "clamp(4.25rem, 26vw, 7.5rem)",
              height: "clamp(4.25rem, 26vw, 7.5rem)",
            }}
          >
            {meowBubbleVisible && !isCatPurring && !isPatPatAnimating ? (
              <div
                className="cat-meow-bubble pointer-events-none absolute -top-[3.35rem] left-1/2 z-20 w-max max-w-[min(14rem,calc(100vw-2rem))]"
                role="status"
              >
                <div className="relative rounded-2xl border border-white/25 bg-white px-3.5 py-2.5 pr-4 text-left shadow-xl">
                  <p className="text-[13px] font-black leading-tight text-slate-800">
                    야옹
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold text-slate-500">
                    집사, 잘 받았다냥
                  </p>
                  <div
                    className="absolute -bottom-1.5 left-5 h-3 w-3 rotate-45 border-b border-r border-white/20 bg-white"
                    aria-hidden
                  />
                </div>
              </div>
            ) : null}
            {isCatPurring && !isPatPatAnimating ? (
              <div
                className="cat-zzzz-text pointer-events-none absolute -top-9 left-1/2 z-30 -translate-x-1/2 select-none text-lg font-black tracking-[0.2em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)] sm:-top-10 sm:text-xl"
                aria-hidden
              >
                Zzzz
              </div>
            ) : null}
            {isPatPatAnimating ? (
              <div
                className="cat-pat-text-pop pointer-events-none absolute -top-10 left-1/2 z-35 -translate-x-1/2 select-none text-base font-black tracking-wide text-amber-100 drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)] sm:-top-11 sm:text-lg"
                role="status"
              >
                Pat! Pat!
              </div>
            ) : null}
            {!catHintDismissed ? (
              <div
                className={`cat-hint-bubble pointer-events-none absolute -top-2 left-1/2 z-[15] w-[min(13.5rem,calc(100vw-3rem))] -translate-x-1/2 transition-opacity duration-500 ease-out sm:-top-3 ${
                  catHintFading ? "cat-hint-bubble--dismissed" : ""
                }`}
                aria-hidden
              >
                <div className="relative rounded-2xl border border-white/20 bg-white/[0.12] px-3.5 py-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.12)] backdrop-blur-md">
                  <div className="relative flex min-h-[2.4rem] w-full items-center justify-center sm:min-h-[2.55rem]">
                    <p
                      className={`absolute inset-x-1 text-center text-[10px] font-semibold leading-snug tracking-wide text-white/90 transition-opacity duration-700 ease-in-out sm:text-[11px] ${
                        catHintIndex === 0 ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      Hold for Purrs
                    </p>
                    <p
                      className={`absolute inset-x-1 text-center text-[10px] font-semibold leading-snug tracking-wide text-white/90 transition-opacity duration-700 ease-in-out sm:text-[11px] ${
                        catHintIndex === 1 ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      Double tap for Butt-pats
                    </p>
                  </div>
                </div>
                <div
                  className="absolute -bottom-0.5 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-px rotate-45 border-b border-r border-white/15 bg-white/[0.1] backdrop-blur-sm"
                  aria-hidden
                />
              </div>
            ) : null}
            <div
              role="button"
              tabIndex={0}
              aria-label="고양이 — 빠르게 두 번 탭하면 Pat! 길게 누르면 골골"
              className={`flex h-full w-full touch-manipulation select-none items-center justify-center ${
                isCatPurring ? "cat-purr-shake" : ""
              } cursor-pointer`}
              style={{ touchAction: "none" }}
              onPointerDown={(e) => {
                if (e.pointerType === "mouse" && e.button !== 0) return;
                if (isPatPatAnimatingRef.current) return;
                if (!catHintDismissed && !catHintFading) {
                  setCatHintFading(true);
                  window.setTimeout(() => setCatHintDismissed(true), 480);
                }
                pressDownAtRef.current = Date.now();
                longPressPurrStartedRef.current = false;
                clearPurrDelayTimer();
                purrDelayTimerRef.current = window.setTimeout(() => {
                  purrDelayTimerRef.current = null;
                  longPressPurrStartedRef.current = true;
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {
                    // ignore
                  }
                  startCatPurr();
                }, 280);
              }}
              onPointerUp={(e) => {
                clearPurrDelayTimer();
                try {
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }
                } catch {
                  // ignore
                }
                if (longPressPurrStartedRef.current) {
                  longPressPurrStartedRef.current = false;
                  stopCatPurr();
                  return;
                }
                const dur = Date.now() - pressDownAtRef.current;
                if (dur < 380 && !isPatPatAnimatingRef.current) {
                  const now = Date.now();
                  if (
                    lastQuickTapRef.current &&
                    now - lastQuickTapRef.current < 420
                  ) {
                    lastQuickTapRef.current = 0;
                    triggerPatPat();
                  } else {
                    lastQuickTapRef.current = now;
                  }
                }
              }}
              onPointerCancel={(e) => {
                clearPurrDelayTimer();
                try {
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }
                } catch {
                  // ignore
                }
                if (longPressPurrStartedRef.current) {
                  longPressPurrStartedRef.current = false;
                  stopCatPurr();
                }
              }}
              onLostPointerCapture={() => {
                clearPurrDelayTimer();
                if (longPressPurrStartedRef.current) {
                  longPressPurrStartedRef.current = false;
                  stopCatPurr();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (!catHintDismissed && !catHintFading) {
                    setCatHintFading(true);
                    window.setTimeout(() => setCatHintDismissed(true), 480);
                  }
                  longPressPurrStartedRef.current = true;
                  startCatPurr();
                }
              }}
              onKeyUp={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  longPressPurrStartedRef.current = false;
                  stopCatPurr();
                }
              }}
            >
              <div className="cat-pat-butt-perspective flex h-full w-full items-center justify-center">
                <div
                  className={`cat-pat-butt-stage flex h-full w-full items-center justify-center ${
                    isPatPatAnimating ? "cat-pat-butt-motion" : ""
                  }`}
                >
                <PixelCat
                  config={data.catConfig}
                  size={120}
                  fill
                  isFloating={!isCatPurring && !isPatPatAnimating}
                  interactionMode={
                    isCatPurring
                      ? "none"
                      : activeModal === "sleep" && isPlaying
                        ? "sleeping"
                        : "none"
                  }
                />
                </div>
              </div>
            </div>
          </div>
          {(data.balloons || 0) === 0 ? (
            <div className="mt-3 max-w-[18rem] shrink-0 rounded-2xl bg-white/10 px-4 py-2 text-center text-[11px] font-bold animate-pulse backdrop-blur-sm">
              풍선을 보내면 여정이 시작됩니다
            </div>
          ) : null}
          </div>
        </div>
      </div>

      {activeModal === null ? (
        <div className="relative z-[90] shrink-0 border-t border-white/10 bg-[#0a0a1a]/90 px-2 pb-2 pt-2 backdrop-blur-md sm:px-3">
          <SendButton
            onClick={() => setActiveModal("memo")}
            variant="dreamy"
          />
        </div>
      ) : null}

      <nav
        className="z-[100] flex shrink-0 items-center justify-around border-t border-white/5 bg-[#0a0a1a] px-2 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 font-black text-white/30 sm:px-4"
        aria-label="Main"
      >
        <button
          onClick={() => {
            setLibraryTab("all");
            setActiveModal("library");
          }}
          className={`flex min-w-0 flex-col items-center gap-0.5 transition-colors ${
            activeModal === "library" ? "text-indigo-400" : ""
          }`}
        >
          <Book size={22} strokeWidth={2} />
          <span className="text-[8px] uppercase leading-none tracking-widest sm:text-[9px]">
            Archive
          </span>
        </button>
        <button
          onClick={() => setActiveModal("sleep")}
          className={`flex min-w-0 flex-col items-center gap-0.5 transition-colors ${
            activeModal === "sleep" ? "text-indigo-400" : ""
          }`}
        >
          <Sparkles size={22} strokeWidth={2} />
          <span className="text-[8px] uppercase leading-none tracking-widest sm:text-[9px]">
            Sleep
          </span>
        </button>

        <button
          onClick={() => setActiveModal("memo")}
          className={`flex min-w-0 flex-col items-center gap-0.5 transition-all ${
            activeModal === "memo"
              ? "scale-105 text-indigo-400"
              : "text-indigo-300"
          }`}
        >
          <div
            className={`rounded-full border-2 border-white/20 bg-indigo-500 p-2 shadow-[0_0_16px_rgba(99,102,241,0.45)] transition-all active:scale-90 sm:p-2.5 ${
              step === 2
                ? "shadow-[0_0_28px_rgba(129,140,248,0.9)] ring-2 ring-indigo-300/70 animate-pulse"
                : ""
            }`}
          >
            <Send size={24} className="text-white sm:h-[26px] sm:w-[26px]" />
          </div>
          <span className="text-[8px] uppercase leading-none tracking-widest sm:text-[9px]">
            Send
          </span>
        </button>

        <button
          onClick={() => setActiveModal("store")}
          className={`flex min-w-0 flex-col items-center gap-0.5 transition-colors ${
            activeModal === "store" ? "text-indigo-400" : ""
          }`}
        >
          <Gift size={22} strokeWidth={2} />
          <span className="text-[8px] uppercase leading-none tracking-widest sm:text-[9px]">
            Shop
          </span>
        </button>
      </nav>
        </div>
      </div>
    </div>
    )}

      {step >= 2 && activeModal === "sleep" && (
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

      {step >= 2 && activeModal === "library" && (
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

      {(step === 1 || (step >= 2 && activeModal === "memo")) && (
        <div
          className={`fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in text-slate-800 font-sans ${
            step === 1 ? "z-[3000]" : "z-[2000]"
          }`}
        >
          <div className="bg-white w-full max-w-sm rounded-[56px] p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-black text-xl tracking-tight">오늘의 인사</h3>
                {step === 1 ? (
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">
                    첫 메시지
                  </p>
                ) : null}
              </div>
              {step !== 1 ? (
                <button
                  onClick={() => setActiveModal(null)}
                  className="text-slate-300 hover:text-slate-500 transition-colors"
                  aria-label="close"
                >
                  <X />
                </button>
              ) : (
                <span className="w-6" aria-hidden />
              )}
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

      {step >= 2 && activeModal === "store" && (
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

      {step >= 2 && activeModal === "account" && (
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
    </>
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
    <div className="fixed inset-0 z-[2500] animate-fade-in overflow-hidden bg-slate-950 font-sans select-none">
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

        <nav
          className="flex shrink-0 items-center justify-around border-t border-white/10 bg-slate-950/80 px-2 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 font-black text-white/30 backdrop-blur-md sm:px-4"
          aria-label="Main"
        >
          <button
            type="button"
            onClick={openLibrary}
            className="flex min-w-0 flex-col items-center gap-0.5 transition-colors"
          >
            <Book size={22} strokeWidth={2} />
            <span className="text-[8px] uppercase leading-none tracking-widest sm:text-[9px]">
              Archive
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveModal("sleep")}
            className="flex min-w-0 flex-col items-center gap-0.5 text-indigo-400 transition-colors"
          >
            <Sparkles size={22} strokeWidth={2} />
            <span className="text-[8px] uppercase leading-none tracking-widest sm:text-[9px]">
              Sleep
            </span>
          </button>
          <button
            type="button"
            onClick={openMemo}
            className="flex min-w-0 flex-col items-center gap-0.5 text-indigo-300 transition-all"
          >
            <div className="rounded-full border-2 border-white/20 bg-indigo-500 p-2 shadow-[0_0_16px_rgba(99,102,241,0.45)] transition-all active:scale-90 sm:p-2.5">
              <Send size={24} className="text-white sm:h-[26px] sm:w-[26px]" />
            </div>
            <span className="text-[8px] uppercase leading-none tracking-widest sm:text-[9px]">
              Send
            </span>
          </button>
          <button
            type="button"
            onClick={openStore}
            className="flex min-w-0 flex-col items-center gap-0.5 transition-colors"
          >
            <Gift size={22} strokeWidth={2} />
            <span className="text-[8px] uppercase leading-none tracking-widest sm:text-[9px]">
              Shop
            </span>
          </button>
        </nav>
      </div>
    </div>
  );
};
