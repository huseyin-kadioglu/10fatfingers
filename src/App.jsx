import { useState, useEffect, useRef } from "react";
import "./App.css";
import WORDS from "./data/turkish_words.json";
import { WorldMapQuiz, WorldMapIcon } from "./WorldMapQuiz";

const getRandom = () => WORDS[Math.floor(Math.random() * WORDS.length)];
const genWordList = (n = 100) => Array.from({ length: n }, getRandom);

// ── Falling Words zorluk fazları ─────────────────────────────────────────────
// speed = piksel / tick (50ms → speed 4 = 80px/s = ~6s düşüş 500px'de)
const PHASES = [
  { maxTime: 25,       spawnMs: 2600, count: 1, sMin: 3.5, sMax: 5.5,  label: "Kolay",      color: "#4ade80" },
  { maxTime: 50,       spawnMs: 2100, count: 1, sMin: 4.5, sMax: 7,    label: "Başlangıç",  color: "#60a5fa" },
  { maxTime: 80,       spawnMs: 1700, count: 2, sMin: 5.5, sMax: 9,    label: "Orta",       color: "#c084fc" },
  { maxTime: 120,      spawnMs: 1300, count: 2, sMin: 7,   sMax: 11,   label: "İleri",      color: "#fbbf24" },
  { maxTime: 180,      spawnMs: 1000, count: 3, sMin: 8.5, sMax: 13,   label: "Zor",        color: "#f97316" },
  { maxTime: Infinity, spawnMs: 700,  count: 3, sMin: 11,  sMax: 16,   label: "Efsane",     color: "#f43f5e" },
];

const getPhase    = (t)  => PHASES.find((p) => t < p.maxTime);
const getPhaseIdx = (t)  => PHASES.findIndex((p) => t < p.maxTime) === -1
  ? PHASES.length - 1
  : PHASES.findIndex((p) => t < p.maxTime);

const getRank = (t) => {
  if (t < 30)  return { label: "Acemi",      color: "#94a3b8" };
  if (t < 60)  return { label: "Başlangıç",  color: "#4ade80" };
  if (t < 90)  return { label: "Orta",       color: "#60a5fa" };
  if (t < 130) return { label: "İleri",      color: "#c084fc" };
  if (t < 180) return { label: "Uzman",      color: "#fbbf24" };
  return              { label: "Efsane",     color: "#f43f5e" };
};

// ── Aktif kelime harf-bazlı render ───────────────────────────────────────────
function ActiveWord({ word, input }) {
  return (
    <>
      {word.split("").map((char, i) => {
        let cls = "char";
        if (i < input.length)    cls += input[i] === char ? " char-ok" : " char-err";
        else if (i === input.length) cls += " char-cursor";
        return <span key={i} className={cls}>{char}</span>;
      })}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WPM TESTİ
// ══════════════════════════════════════════════════════════════════════════════
function WPMTest({ onBack, onRestart }) {
  const [words]    = useState(() => genWordList(100));
  const [idx,       setIdx]      = useState(0);
  const [input,     setInput]    = useState("");
  const [typed,     setTyped]    = useState([]);
  const [timeLeft,  setTimeLeft] = useState(60);
  const [elapsed,   setElapsed]  = useState(0);
  const [started,   setStarted]  = useState(false);
  const [done,      setDone]     = useState(false);

  const inputRef   = useRef(null);
  const timerRef   = useRef(null);
  const activeRef  = useRef(null);
  const boxRef     = useRef(null);

  // Karakter bazlı WPM (standart: 5 karakter = 1 kelime)
  const correctChars = typed
    .filter((t) => t.correct)
    .reduce((s, t) => s + t.word.length + 1, 0);  // +1 boşluk için
  const liveWpm = elapsed > 0
    ? Math.round((correctChars / 5) / (elapsed / 60))
    : 0;

  // Aktif kelimeyi kutunun 2. satırına hizala
  useEffect(() => {
    if (!activeRef.current || !boxRef.current) return;
    const lineH = activeRef.current.offsetHeight || 54;
    const top   = activeRef.current.offsetTop;
    boxRef.current.scrollTop = Math.max(0, top - lineH);
  }, [idx]);

  // Zamanlayıcı
  useEffect(() => {
    if (!started || done) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current); setDone(true); return 0; }
        return t - 1;
      });
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [started, done]);

  const handleInput = (e) => {
    const val = e.target.value;
    if (!started && val.length > 0) setStarted(true);

    if (val.endsWith(" ")) {
      const trimmed = val.trim();
      setTyped((prev) => [
        ...prev,
        { word: words[idx], correct: trimmed === words[idx] },
      ]);
      setIdx((i) => i + 1);
      setInput("");
      return;
    }
    setInput(val);
  };

  useEffect(() => { inputRef.current?.focus(); }, []);

  // ── Sonuç ekranı ────────────────────────────────────────────────────────────
  if (done) {
    const finalWpm = Math.round((correctChars / 5) / 1); // 60sn = 1dk
    const correctWords = typed.filter((t) => t.correct).length;
    const shareText = `60 saniyede ${finalWpm} WPM ile yazdım! Türkçe klavye hız testinde sen ne kadar yaparsın?`;
    const waUrl  = `https://wa.me/?text=${encodeURIComponent(shareText + " " + window.location.href)}`;
    const twUrl  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(window.location.href)}`;

    return (
      <div className="result-screen">
        <div className="result-card">
          <p className="result-label">WPM Testi</p>
          <div className="big-wpm">
            {finalWpm}<span className="wpm-unit"> wpm</span>
          </div>
          <div className="result-stats">
            <div className="stat-item">
              <span className="stat-num">{typed.length}</span>
              <span className="stat-label">kelime</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-num">{correctWords}</span>
              <span className="stat-label">doğru</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-num">{typed.length - correctWords}</span>
              <span className="stat-label">hata</span>
            </div>
          </div>
          <div className="share-row">
            <a className="share-btn wa" href={waUrl} target="_blank" rel="noopener noreferrer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
            <a className="share-btn tw" href={twUrl} target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Twitter / X
            </a>
          </div>
          <div className="result-btns">
            <button className="btn-primary" onClick={onRestart}>Tekrar Dene</button>
            <button className="btn-secondary" onClick={onBack}>Ana Menü</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Oyun ekranı ─────────────────────────────────────────────────────────────
  return (
    <div className="wpm-screen">
      <div className="top-bar">
        <button className="back-btn" onClick={onBack}>← Geri</button>
        <div className="stats-row">
          <span className={`timer-badge${timeLeft <= 10 ? " danger" : ""}`}>{timeLeft}s</span>
          <span className="live-wpm">{started ? liveWpm : "--"} wpm</span>
        </div>
      </div>

      <div
        className="words-box"
        ref={boxRef}
        onClick={() => inputRef.current?.focus()}
      >
        {words.map((word, i) => {
          let cls = "word-token";
          if (i < idx)       cls += typed[i]?.correct ? " done-ok" : " done-err";
          else if (i === idx) cls += " active";
          return (
            <span
              key={i}
              ref={i === idx ? activeRef : null}
              className={cls}
            >
              {i === idx ? <ActiveWord word={word} input={input} /> : word}
              {" "}
            </span>
          );
        })}
      </div>

      <input
        ref={inputRef}
        className="typing-input"
        value={input}
        onChange={handleInput}
        placeholder={started ? "" : "yazmaya başla — boşluk ile ilerle..."}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />

      {!started && (
        <p className="hint-text">Yazmaya başladığında süre başlar</p>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FALLING WORDS
// ══════════════════════════════════════════════════════════════════════════════
function FallingWords({ onBack }) {
  const [fallingWords,   setFallingWords]   = useState([]);
  const [input,          setInput]          = useState("");
  const [wpm,            setWpm]            = useState(0);
  const [score,          setScore]          = useState(0);
  const [lives,          setLives]          = useState(5);
  const [elapsed,        setElapsed]        = useState(0);
  const [phase,          setPhase]          = useState("start");
  const [phaseIdx,       setPhaseIdx]       = useState(0);
  const [gameSize,       setGameSize]       = useState({ width: 860, height: 560 });

  const totalChars   = useRef(0);
  const scoreRef     = useRef(0);
  const elapsedRef   = useRef(0);
  const timerRef     = useRef(null);
  const inputRef     = useRef(null);
  const lastSpawnRef = useRef(0);
  const scoreMultipliers = [1, 1.5, 2, 2.5, 3.5, 5];

  // Responsive boyut
  useEffect(() => {
    const resize = () => {
      const w = Math.min(window.innerWidth - 48, 860);
      const h = window.innerWidth < 640 ? 420 : 560;
      setGameSize({ width: w, height: h });
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const startGame = () => {
    setFallingWords([]);
    setInput(""); setWpm(0); setScore(0); setLives(5);
    totalChars.current = 0; scoreRef.current = 0;
    elapsedRef.current = 0; setElapsed(0);
    lastSpawnRef.current = 0;
    setPhaseIdx(0);
    setPhase("playing");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Zamanlayıcı
  useEffect(() => {
    if (phase !== "playing") return;
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
      setPhaseIdx(getPhaseIdx(elapsedRef.current));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // Can sıfırınca bitiş
  useEffect(() => {
    if (lives <= 0 && phase === "playing") {
      clearInterval(timerRef.current);
      setPhase("over");
    }
  }, [lives, phase]);

  // Kelime üretme — check her 150ms, spawnMs'e göre üret
  useEffect(() => {
    if (phase !== "playing") return;
    const tick = setInterval(() => {
      const t   = elapsedRef.current;
      const p   = getPhase(t);
      const now = Date.now();
      if (now - lastSpawnRef.current < p.spawnMs) return;
      lastSpawnRef.current = now;

      const positions = [];
      const newWords  = [];
      for (let i = 0; i < p.count; i++) {
        const word  = getRandom();
        const wordW = word.length * 12;
        let left, tries = 0;
        do {
          left = 16 + Math.random() * Math.max(gameSize.width - wordW - 32, 0);
          tries++;
        } while (positions.some((x) => Math.abs(x - left) < wordW + 24) && tries < 10);
        positions.push(left);

        const speed = p.sMin + Math.random() * (p.sMax - p.sMin);
        newWords.push({
          id:    `${now}-${i}-${Math.random()}`,
          word,
          top:   0,
          left,
          speed,
        });
      }
      setFallingWords((prev) => [...prev, ...newWords]);
    }, 150);
    return () => clearInterval(tick);
  }, [phase, gameSize]);

  // Düşme döngüsü — 50ms tick
  useEffect(() => {
    if (phase !== "playing") return;
    const fall = setInterval(() => {
      setFallingWords((prev) => {
        const next = [];
        let lost = 0;
        for (const w of prev) {
          const newTop = w.top + w.speed;
          if (newTop >= gameSize.height - 44) { lost++; }
          else { next.push({ ...w, top: newTop }); }
        }
        if (lost > 0) setLives((l) => Math.max(l - lost, 0));
        return next;
      });
    }, 50);
    return () => clearInterval(fall);
  }, [phase, gameSize]);

  // Input
  const handleInput = (e) => {
    const val = e.target.value.toLowerCase();
    setInput(val);
    const match = fallingWords.find((w) => w.word === val.trim());
    if (match) {
      setFallingWords((prev) => prev.filter((w) => w.id !== match.id));
      totalChars.current += match.word.length;
      const mins = Math.max(elapsedRef.current / 60, 1 / 60);
      setWpm(Math.round((totalChars.current / 5) / mins));
      const mult   = scoreMultipliers[phaseIdx] ?? 1;
      const points = Math.ceil(match.word.length * mult);
      scoreRef.current += points;
      setScore(scoreRef.current);
      setInput("");
    }
  };

  const handleBack = () => { clearInterval(timerRef.current); onBack(); };

  // ── Başlangıç ──────────────────────────────────────────────────────────────
  if (phase === "start") {
    return (
      <div className="center-screen falling-bg">
        <div className="info-card">
          <button className="back-btn solo" onClick={handleBack}>← Geri</button>
          <div className="card-icon-lg">🎯</div>
          <h2>Falling Words</h2>
          <p>
            Düşen kelimeleri yazarak yok et.<br />
            Alt çizgiye değen her kelime bir can götürür.<br />
            Toplam <strong>5 canın</strong> var. Ne kadar dayanabilirsin?
          </p>
          <div className="difficulty-preview">
            {PHASES.slice(0, 4).map((p, i) => (
              <span key={i}>
                <span className="diff-chip" style={{ color: p.color, borderColor: p.color }}>{p.label}</span>
                {i < 3 && <span className="diff-arrow">→</span>}
              </span>
            ))}
          </div>
          <button className="btn-primary" onClick={startGame}>Başlat</button>
        </div>
      </div>
    );
  }

  // ── Oyun bitti ─────────────────────────────────────────────────────────────
  if (phase === "over") {
    const rank      = getRank(elapsed);
    const shareText = `${elapsed}sn hayatta kaldım, ${wpm} WPM, ${score} puan! Rütbe: ${rank.label}. 10fatfingers'da sen ne kadar dayanırsın?`;
    const waUrl     = `https://wa.me/?text=${encodeURIComponent(shareText + " " + window.location.href)}`;
    const twUrl     = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(window.location.href)}`;

    return (
      <div className="result-screen falling-bg">
        <div className="result-card">
          <p className="result-label">Oyun Bitti</p>
          <div className="rank-badge" style={{ color: rank.color, borderColor: rank.color + "44" }}>
            {rank.label}
          </div>
          <div className="big-wpm">
            {wpm}<span className="wpm-unit"> wpm</span>
          </div>
          <div className="result-stats">
            <div className="stat-item">
              <span className="stat-num">{score}</span>
              <span className="stat-label">puan</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-num">{elapsed}</span>
              <span className="stat-label">saniye</span>
            </div>
          </div>
          <div className="share-row">
            <a className="share-btn wa" href={waUrl} target="_blank" rel="noopener noreferrer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
            <a className="share-btn tw" href={twUrl} target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Twitter / X
            </a>
          </div>
          <div className="result-btns">
            <button className="btn-primary" onClick={startGame}>Tekrar Oyna</button>
            <button className="btn-secondary" onClick={handleBack}>Ana Menü</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Oyun ekranı ─────────────────────────────────────────────────────────────
  const currentPhase = PHASES[phaseIdx];
  return (
    <div className="falling-screen falling-bg">
      <div className="top-bar">
        <button className="back-btn dark-btn" onClick={handleBack}>← Geri</button>
        <div className="stats-row">
          <span className="lives-display">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className={i < lives ? "heart filled" : "heart"}>♥</span>
            ))}
          </span>
          <span className="phase-badge" style={{ color: currentPhase.color }}>
            {currentPhase.label}
          </span>
          <span className="live-wpm dark-text">{wpm} wpm</span>
          <span className="timer-badge">{elapsed}s</span>
        </div>
      </div>

      <div
        className="fall-arena"
        style={{ width: gameSize.width, height: gameSize.height }}
      >
        {fallingWords.map((w) => {
          // CSS class ile yumuşak renk geçişi: lavanta → sarı → kırmızı
          const ratio = w.top / gameSize.height;
          let wordCls = "fall-word";
          if (ratio > 0.72)      wordCls += " fw-urgent";
          else if (ratio > 0.50) wordCls += " fw-warn";
          return (
            <div
              key={w.id}
              className={wordCls}
              style={{ top: w.top, left: w.left }}
            >
              {w.word}
            </div>
          );
        })}
        <div className="danger-line" />
      </div>

      <input
        ref={inputRef}
        className="typing-input dark-input"
        value={input}
        onChange={handleInput}
        placeholder="kelimeyi yaz..."
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <div className="score-ticker">
        Puan: <strong>{score}</strong>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ANA MENÜ
// ══════════════════════════════════════════════════════════════════════════════
function Home({ onSelect }) {
  return (
    <div className="home">
      <h1 className="logo-text">10fatfingers</h1>
      <p className="tagline">Türkçe klavye hız testi</p>
      <div className="mode-grid">
        <button className="mode-card" onClick={() => onSelect("falling")}>
          <div className="card-icon">🎯</div>
          <h2>Falling Words</h2>
          <p>Düşen kelimeleri yakala, canını koru!</p>
          <span className="card-tag">Rekabetçi</span>
        </button>
        <button className="mode-card" onClick={() => onSelect("wpm")}>
          <div className="card-icon">⌨️</div>
          <h2>WPM Testi</h2>
          <p>60 saniyede kaç kelime yazabilirsin?</p>
          <span className="card-tag">60 saniye</span>
        </button>
        <button className="mode-card mode-card-map" onClick={() => onSelect("worldmap")}>
          <div className="card-icon"><WorldMapIcon /></div>
          <h2>Dünya Haritası</h2>
          <p>10 dakikada kaç ülkeyi bilebilirsin?</p>
          <span className="card-tag card-tag-blue">Coğrafya</span>
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// APP KÖK
// ══════════════════════════════════════════════════════════════════════════════
function App() {
  const [mode,   setMode]   = useState(null);
  const [wpmKey, setWpmKey] = useState(0);

  return (
    <div className="app-root">
      {mode === null     && <Home onSelect={setMode} />}
      {mode === "wpm"    && (
        <WPMTest
          key={wpmKey}
          onBack={() => setMode(null)}
          onRestart={() => setWpmKey((k) => k + 1)}
        />
      )}
      {mode === "falling"  && <FallingWords onBack={() => setMode(null)} />}
      {mode === "worldmap" && <WorldMapQuiz onBack={() => setMode(null)} />}
    </div>
  );
}

export default App;
