import { useState, useEffect, useRef } from "react";
import "./App.css";
import { Helmet } from "react-helmet";

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
  const [wordsPerInterval, setWordsPerInterval] = useState(1);

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
    setWordsPerInterval(1);
    totalTyped.current = 0;
    elapsedRef.current = 0;
    setElapsedTime(0);
    setGameStarted(true);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  // Visibility / Tab değişimi kontrolü
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

      if (elapsedRef.current > 20 && elapsedRef.current % 15 === 0) {
        setWordsPerInterval((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [gameStarted]);

  // Can sıfırlama ve oyun bitirme
  useEffect(() => {
    if (lives === 0 && gameStarted) {
      setGameStarted(false);
      clearInterval(timerRef.current);
    }
  }, [lives, gameStarted]);

  // Kelime ekleme
  useEffect(() => {
    if (!gameStarted) return;

    const addWord = () => {
      const newWords = [];
      const positions = [];
      for (let i = 0; i < wordsPerInterval; i++) {
        const word = WORDS[Math.floor(Math.random() * WORDS.length)];
        let left;
        let tries = 0;
        do {
          left = Math.random() * (GAME_WIDTH - 100);
          tries++;
        } while (positions.some((p) => Math.abs(p - left) < 80) && tries < 10);
        positions.push(left);

        const speed = 0.5 + Math.random() * 1 + elapsedRef.current * 0.02;
        newWords.push({ word, top: 0, left, speed });
      }
      setFallingWords((prev) => [...prev, ...newWords]);
    };

    addWord();

    const interval = setInterval(
      addWord,
      Math.max(2000 - elapsedRef.current * 10, 500)
    );
    return () => clearInterval(interval);
  }, [gameStarted, wordsPerInterval]);

  // Kelimeleri düşür
  useEffect(() => {
    if (!gameStarted) return;

    const fall = setInterval(() => {
      setFallingWords((prev) => {
        const survived = [];
        prev.forEach((w) => {
          const newTop = w.top + w.speed;
          if (newTop >= GAME_HEIGHT - 30) {
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
  }, [gameStarted]);

  // Input ve WPM
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
      <Helmet>
        <title>⌨️ Typing Rush - Hızını Test Et!</title>
        <meta
          name="description"
          content="En hızlı yazan sen misin? Typing Rush ile yazma hızını test et!"
        />
        <meta property="og:title" content="⌨️ Typing Rush - Hızını Test Et!" />
        <meta
          property="og:description"
          content="En hızlı yazan sen misin? Typing Rush ile öğren!"
        />
        <meta property="og:image" content="oyun_ekran_gorseli.png" />
        <meta property="og:url" content="https://seninsiten.com" />
      </Helmet>
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

          <div
            className="game-container"
            style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
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
            ref={inputRef} // 🔑 burası eklendi
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

            <div className="share-buttons">
              <a
                href={`https://api.whatsapp.com/send?text=Ben ${elapsedTime} saniye dayanabildim ve WPM'im ${wpm}! Sen ne kadar dayanabilirsin? Oyna: https://typingrush.com.tr`}
                target="_blank"
                rel="noopener noreferrer"
                className="share-btn whatsapp-btn"
              >
                WhatsApp
              </a>

              <a
                href={`https://twitter.com/intent/tweet?text=Ben ${elapsedTime} saniye dayanabildim ve WPM'im ${wpm}! Sen ne kadar dayanabilirsin? Oyna: https://typingrush.com.tr`}
                target="_blank"
                rel="noopener noreferrer"
                className="share-btn twitter-btn"
              >
                Twitter
              </a>
            </div>

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
