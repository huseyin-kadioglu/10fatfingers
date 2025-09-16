import { useState, useEffect, useRef } from "react";
import WORDS from "./data/turkish_words.json";

const TOTAL_WORDS = 24; // bir partta gösterilecek kelime sayısı
const TEST_TIME = 60; // saniye

export default function WpmGame() {
  const [words, setWords] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(TEST_TIME);
  const [gameActive, setGameActive] = useState(false);
  const [wpm, setWpm] = useState(0);

  const inputRef = useRef(null);

  // Başlangıç kelimeleri
  useEffect(() => {
    const shuffleWords = [...WORDS].sort(() => 0.5 - Math.random());
    setWords(shuffleWords.slice(0, TOTAL_WORDS));
  }, []);

  // Timer
  useEffect(() => {
    if (!gameActive) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          setGameActive(false);
          calculateWpm();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameActive]);

  const startGame = () => {
    setGameActive(true);
    setTimeLeft(TEST_TIME);
    setInput("");
    setCurrentWordIndex(0);
    setWpm(0);
    inputRef.current.focus();
  };

  const calculateWpm = () => {
    const typedChars = words.slice(0, currentWordIndex).join(" ").length;
    setWpm(Math.round(typedChars / 5));
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setInput(val);

    const currentWord = words[currentWordIndex];
    if (val.endsWith(" ")) {
      if (val.trim() === currentWord) {
        setCurrentWordIndex((i) => i + 1);
      }
      setInput("");
      // Part tamamlandıysa yeni kelimeler
      if (currentWordIndex + 1 >= words.length) {
        const shuffleWords = [...WORDS].sort(() => 0.5 - Math.random());
        setWords(shuffleWords.slice(0, TOTAL_WORDS));
        setCurrentWordIndex(0);
      }
    }
  };

  const getCharClass = (char, index) => {
    if (!input[index]) return "";
    return input[index] === char ? "correct-char" : "wrong-char";
  };

  return (
    <div className="wpm-game">
      <div className="info-bar">
        <span>⏱️ {timeLeft}s</span>
        {gameActive ? null : <span>WPM: {wpm}</span>}
        <button className="restart-btn" onClick={startGame}>
          ↻ Başlat / Tekrar
        </button>
      </div>

      <div className="test-text" onClick={() => inputRef.current.focus()}>
        {words.map((word, wIndex) => {
          const isCurrent = wIndex === currentWordIndex;
          return (
            <span key={wIndex} className="wpm-word">
              {word.split("").map((c, i) => (
                <span
                  key={i}
                  className={
                    input[i] === c
                      ? "correct-char"
                      : input[i]
                      ? "wrong-char"
                      : ""
                  }
                >
                  {c}
                  {isCurrent && i === input.length && (
                    <span
                      className={`caret ${input[i] !== c ? "wrong" : ""}`}
                    ></span>
                  )}
                </span>
              ))}
              {!isCurrent && " "} {/* Boşluk ekleyelim */}
            </span>
          );
        })}
      </div>

      <input
        ref={inputRef}
        type="text"
        className="typing-input"
        value={input}
        onChange={handleInput}
        disabled={!gameActive}
        placeholder="Yazmaya başlamak için Başlat'a bas..."
        autoFocus
      />
    </div>
  );
}
