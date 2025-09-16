import { useState, useEffect, useRef } from "react";
import "./App.css";
import WORDS from "./data/turkish_words.json";
import FallingWords from "./FallingWords";
import { StartScreen } from "./StartScreen";
import WpmGame from "./WpmGame";

function App() {
  const [mode, setMode] = useState(null); // "falling" | "wpm"
  const [fallingWords, setFallingWords] = useState([]);
  const [input, setInput] = useState("");
  const [wpm, setWpm] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [lives, setLives] = useState(5);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gameSize, setGameSize] = useState({ width: 900, height: 600 });

  const totalTyped = useRef(0);
  const elapsedRef = useRef(0);
  const timerRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // === Resize Listener ===
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setGameSize({
        width: isMobile ? 320 : 900,
        height: isMobile ? 450 : 600,
      });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // === FALLING WORDS GAME ===
  const startFallingGame = () => {
    setFallingWords([]);
    setInput("");
    setWpm(0);
    setLives(5);
    totalTyped.current = 0;
    elapsedRef.current = 0;
    setElapsedTime(0);
    setGameStarted(true);
    setMode("falling");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Tab change stop game
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setGameStarted(false);
        clearInterval(timerRef.current);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Timer
  useEffect(() => {
    if (!gameStarted) return;
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsedTime(elapsedRef.current);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gameStarted]);

  // Stop game if lives=0
  useEffect(() => {
    if (lives === 0 && gameStarted) {
      setGameStarted(false);
      clearInterval(timerRef.current);
    }
  }, [lives, gameStarted]);

  // Spawn words
  useEffect(() => {
    if (!gameStarted || mode !== "falling") return;

    const spawnWords = () => {
      const time = elapsedRef.current;
      let count, speedFactor;
      if (time < 20) {
        count = 1;
        speedFactor = 1;
      } else if (time < 60) {
        count = 2;
        speedFactor = 1.3;
      } else {
        count = 3;
        speedFactor = 1.1;
      }

      const newWords = [];
      const positions = [];
      for (let i = 0; i < count; i++) {
        const word = WORDS[Math.floor(Math.random() * WORDS.length)];
        const wordWidth = word.length * 14;
        let left;
        let tries = 0;
        do {
          left = Math.random() * Math.max(gameSize.width - wordWidth, 0);
          tries++;
        } while (
          positions.some((p) => Math.abs(p - left) < wordWidth + 20) &&
          tries < 10
        );
        positions.push(left);
        const baseSpeed = 0.5 + Math.random() * 1;
        newWords.push({ word, top: 0, left, speed: baseSpeed * speedFactor });
      }
      setFallingWords((prev) => [...prev, ...newWords]);
    };

    const interval = setInterval(() => spawnWords(), 1000);
    return () => clearInterval(interval);
  }, [gameStarted, gameSize, elapsedTime, mode]);

  // Falling movement
  useEffect(() => {
    if (!gameStarted || mode !== "falling") return;
    const fall = setInterval(() => {
      setFallingWords((prev) => {
        const survived = [];
        prev.forEach((w) => {
          const newTop = w.top + w.speed;
          if (newTop >= gameSize.height - 30) {
            if (!w.hit) {
              setLives((l) => Math.max(l - 1, 0));
              w.hit = true;
            }
          } else {
            survived.push({ ...w, top: newTop });
          }
        });
        return survived;
      });
    }, 50);
    return () => clearInterval(fall);
  }, [gameStarted, gameSize, mode]);

  const handleInput = (e) => {
    const val = e.target.value.toLowerCase();
    setInput(val);
    const match = fallingWords.find((w) => w.word === val.trim());
    if (match) {
      setFallingWords((prev) => prev.filter((w) => w !== match));
      totalTyped.current += match.word.length;
      const elapsedMinutes = Math.max(elapsedRef.current / 60, 1 / 60);
      setWpm(Math.round(totalTyped.current / 5 / elapsedMinutes));
      setInput("");
    }
  };

  // === LEARN WPM GAME ===
  const [wpmInput, setWpmInput] = useState("");
  const [wpmTimeLeft, setWpmTimeLeft] = useState(60);
  const [wpmActive, setWpmActive] = useState(false);
  const sampleText =
    "Merhaba bu bir test metnidir. Burada yazma hızınızı ölçebilirsiniz.";

  const startWpmTest = () => {
    setMode("wpm");
    setWpmInput("");
    setWpm(0);
    setWpmTimeLeft(60);
    setWpmActive(true);

    const timer = setInterval(() => {
      setWpmTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          setWpmActive(false);
          const wordsTyped = wpmInput.trim().split(/\s+/).length;
          setWpm(wordsTyped);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  // === UI ===
  return (
    <div className="app">
      {!mode && (
        <StartScreen
          startFallingGame={startFallingGame}
          //startWpmTest={startWpmTest}
        />
      )}

      {/* Falling Words Mode */}
      {mode === "falling" && gameStarted && lives > 0 && (
        <FallingWords
          fallingWords={fallingWords}
          gameSize={gameSize}
          lives={lives}
          wpm={wpm}
          elapsedTime={elapsedTime}
          containerRef={containerRef}
          inputRef={inputRef}
          input={input}
          handleInput={handleInput}
          gameStarted={gameStarted}
          totalTyped={totalTyped}
          startFallingGame={startFallingGame}
        />
      )}

      {/* Learn WPM Mode */}
      {/* {mode === "wpm" && <WpmGame onExit={() => setMode(null)} />} */}
    </div>
  );
}

export default App;
