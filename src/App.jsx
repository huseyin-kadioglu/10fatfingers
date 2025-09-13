import { useState, useEffect, useRef } from "react";
import "./App.css";
import WORDS from "./data/turkish_words.json";

function App() {
  const GAME_WIDTH = 900;
  const GAME_HEIGHT = 600;

  const [fallingWords, setFallingWords] = useState([]);
  const [input, setInput] = useState("");
  const [wpm, setWpm] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [lives, setLives] = useState(5);
  const [elapsedTime, setElapsedTime] = useState(0);

  const totalTyped = useRef(0);
  const elapsedRef = useRef(0);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

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

    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
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
          left = Math.random() * (GAME_WIDTH - 100);
          tries++;
        } while (positions.some((p) => Math.abs(p - left) < 80) && tries < 10);
        positions.push(left);

        const baseSpeed = 0.5 + Math.random() * 1;
        newWords.push({ word, top: 0, left, speed: baseSpeed * speedFactor });
      }
      setFallingWords(prev => [...prev, ...newWords]);
    };

    const interval = setInterval(() => {
      spawnWords();
    }, 1000); // 1 saniyede bir spawn

    return () => clearInterval(interval);
  }, [gameStarted, elapsedTime]);

  // Kelimeleri düşür
  useEffect(() => {
    if (!gameStarted) return;

    const fall = setInterval(() => {
      setFallingWords(prev => {
        const survived = [];
        prev.forEach(w => {
          const newTop = w.top + w.speed;
          if (newTop >= GAME_HEIGHT - 30) {
            if (!w.hit) {
              setLives(l => Math.max(l - 1, 0));
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
  }, [gameStarted]);

  // Input ve WPM hesaplama
  const handleInput = (e) => {
    setInput(e.target.value);
    const match = fallingWords.find(w => w.word === e.target.value.trim());
    if (match) {
      setFallingWords(prev => prev.filter(w => w !== match));
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
        <button className="start-btn" onClick={startGame}>
          ▶ Başlat
        </button>
      )}

      {gameStarted && lives > 0 && (
        <>
          <div className="info-bar">
            <span>❤️ {lives}</span>
            <span>WPM: {wpm}</span>
            <span>⏱️ {elapsedTime}s</span>
          </div>

          <div className="game-container" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
            {fallingWords.map((w, i) => (
              <div key={i} className="word" style={{ top: w.top, left: w.left }}>
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
