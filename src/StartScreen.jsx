import "./App.css";

export const StartScreen = ({ startFallingGame, startWpmTest }) => {
  return (
    <div>
      <h1 className="game-title">Klavye Hız Testi</h1>
      <p className="beta-info">
        ⚠️ Beta Version! Currently only Turkish is supported.
      </p>

      <div className="mode-selection">
        <div className="mode-card" onClick={startFallingGame}>
          <div className="mode-title">Falling Words Survival</div>
          <div className="mode-description">
            Ekrandan düşen kelimeleri hızlıca yazarak hayatta kal!
          </div>
          <button>Başlat</button>
        </div>

        {/* <div className="mode-card" onClick={startWpmTest}>
          <div className="mode-title">Learn Your WPM</div>
          <div className="mode-description">
            1 dakika boyunca verilen metni yaz, kaç kelime yazdığını gör.
          </div>
          <button>Başlat</button>
        </div> */}
      </div>
    </div>
  );
};
