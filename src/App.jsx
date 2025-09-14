import { useState, useEffect, useRef } from "react";
import "./App.css";
import WORDS from "./data/turkish_words.json";

function App() {
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

  // Resize listener
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

  // Başlat
  const startGame = () => {
    setFallingWords([]);
    setInput("");
    setWpm(0);
    setLives(5);
    totalTyped.current = 0;
    elapsedRef.current = 0;
    setElapsedTime(0);
    setGameStarted(true);

    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Tab değişince oyunu durdur
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

  // Zaman sayacı
  useEffect(() => {
    if (!gameStarted) return;

    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsedTime(elapsedRef.current);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [gameStarted]);

  // Can bitince oyun durur
  useEffect(() => {
    if (lives === 0 && gameStarted) {
      setGameStarted(false);
      clearInterval(timerRef.current);
    }
  }, [lives, gameStarted]);

  // Kelime ekleme (dalga mantığı)
  useEffect(() => {
    if (!gameStarted) return;

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
        let left;
        let tries = 0;
        do {
          left = Math.random() * (gameSize.width - 100);
          tries++;
        } while (positions.some((p) => Math.abs(p - left) < 80) && tries < 10);
        positions.push(left);

        const baseSpeed = 0.5 + Math.random() * 1;
        newWords.push({ word, top: 0, left, speed: baseSpeed * speedFactor });
      }
      setFallingWords((prev) => [...prev, ...newWords]);
    };

    const interval = setInterval(() => spawnWords(), 1000);
    return () => clearInterval(interval);
  }, [gameStarted, gameSize, elapsedTime]);

  // Kelimeleri düşür
  useEffect(() => {
    if (!gameStarted) return;

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
  }, [gameStarted, gameSize]);

  // Input ve WPM hesaplama
  const handleInput = (e) => {
    setInput(e.target.value);
    const match = fallingWords.find((w) => w.word === e.target.value.trim());
    if (match) {
      setFallingWords((prev) => prev.filter((w) => w !== match));
      totalTyped.current += match.word.length;
      const elapsedMinutes = Math.max(elapsedRef.current / 60, 1 / 60);
      setWpm(Math.round(totalTyped.current / 5 / elapsedMinutes));
      setInput("");
    }
  };

  return (
    <div className="app">
      <h1 className="game-title">Klavye Hız Testi</h1>

      {!gameStarted && (
        <>
          <button className="start-btn" onClick={startGame}>
            ▶ Başlat
          </button>
          <p className="beta-info">
            ⚠️ Beta Version! Currently only Turkish is supported. Stay tuned — you
            won’t regret it!
          </p>
        </>
      )}

      {gameStarted && lives > 0 && (
        <>
          <div className="info-bar">
            <span>❤️ {lives}</span>
            <span>WPM: {wpm}</span>
            <span>⏱️ {elapsedTime}s</span>
          </div>

          <div
            ref={containerRef}
            className="game-container"
            style={{ width: gameSize.width, height: gameSize.height }}
          >
            {fallingWords.map((w, i) => (
              <div
                key={i}
                className="word"
                style={{ top: w.top, left: w.left }}
              >
                {w.word}
              </div>
            ))}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInput}
            placeholder="Buraya yaz..."
            className="typing-input"
          />
        </>
      )}

      {(!gameStarted || lives === 0) && elapsedTime > 0 && (
        <div className="game-over-overlay">
          <div className="game-over-dialog">
            <h1>Klavye Hız Testi</h1>
            <p className="game-over-text">
              Bu oyunda <strong>{elapsedTime}</strong> saniye dayanabildiniz.
            </p>
            <p className="game-over-text">
              WPM: <strong>{wpm}</strong>
            </p>
            <p className="game-over-text">
              Hemen arkadaşlarınla paylaş ve onlarla rekabet et!
            </p>
            <button
              className="start-btn play-again-btn"
              onClick={() => {
                setElapsedTime(0);
                startGame();
              }}
            >
              ↻ Tekrar Oyna
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
