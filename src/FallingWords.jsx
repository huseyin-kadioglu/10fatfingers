import "./App.css";

export default function FallingWords({
  fallingWords,
  gameSize,
  lives,
  wpm,
  elapsedTime,
  containerRef,
  inputRef,
  input,
  handleInput,
  gameStarted,
  totalTyped,
  startFallingGame,
}) {
  return (
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
            style={{ top: w.top, left: w.left, position: "absolute" }}
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
        placeholder="buraya yaz..."
        className="typing-input"
      />

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
                className="whatsapp-btn"
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
              <a
                className="twitter-btn"
                href={`https://twitter.com/intent/tweet?text=Ben ${wpm} WPM ile Klavye Hız Testinde oynadım! Sen de dene: ${window.location.href}`}
                target="_blank"
                rel="noopener noreferrer"
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
              style={{ marginTop: "20px" }}
            >
              ↻ Tekrar Oyna
            </button>
          </div>
        </div>
      )}
    </>
  );
}
