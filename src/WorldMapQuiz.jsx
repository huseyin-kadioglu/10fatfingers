import { useState, useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import { COUNTRIES, TOTAL_COUNTRIES } from './data/countries'

const MAP_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json'

// world-atlas bazı IDs'leri "032" gibi leading-zero string saklar,
// bazıları integer 32 saklar. İkisini de "32" → normalized stringe çek.
const normId = (id) => {
  const n = Number(id)
  return isNaN(n) ? String(id) : String(n)
}

const normalize = (str) =>
  str.trim().toLowerCase()
    .replace(/\u0307/g, '')  // İ.toLowerCase() → i + U+0307; noktayı at
    .replace(/ı/g, 'i')      // dotless ı → i ("ırak" → "irak" eşleşsin)

// ── Ana menü kartı ikonu ──────────────────────────────────────────────────────
export function WorldMapIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
      <circle cx="32" cy="32" r="28" fill="#89b4fa" opacity="0.18" stroke="#89b4fa" strokeWidth="1.5"/>
      <ellipse cx="32" cy="32" rx="10" ry="28" fill="none" stroke="#89b4fa" strokeWidth="1.2" opacity="0.6"/>
      <line x1="4" y1="32" x2="60" y2="32" stroke="#89b4fa" strokeWidth="1.2" opacity="0.6"/>
      <path d="M8 20 Q20 16 32 20 Q44 24 56 20" stroke="#89b4fa" strokeWidth="1" fill="none" opacity="0.5"/>
      <path d="M8 44 Q20 48 32 44 Q44 40 56 44" stroke="#89b4fa" strokeWidth="1" fill="none" opacity="0.5"/>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export function WorldMapQuiz({ onBack }) {
  const svgRef       = useRef(null)
  const containerRef = useRef(null)
  const mapDataRef   = useRef(null)
  const timerRef     = useRef(null)
  const debounceRef  = useRef(null)
  const fbTimerRef   = useRef(null)
  const guessedRef   = useRef(new Set())
  const inputRef     = useRef(null)

  const DURATION = 600

  const [gameState,    setGameState]    = useState('idle')
  const [guessedCount, setGuessedCount] = useState(0)
  const [timeLeft,     setTimeLeft]     = useState(DURATION)
  const [inputValue,   setInputValue]   = useState('')
  const [feedback,     setFeedback]     = useState(null)
  const [mapLoaded,    setMapLoaded]    = useState(false)
  const [mapError,     setMapError]     = useState(false)
  const [missedList,   setMissedList]   = useState([])
  const [finalCount,   setFinalCount]   = useState(0)

  // ── D3 ile harita çiz — useEffect'lerden ÖNCE tanımlanmalı ────────────────
  const drawMap = useCallback((world) => {
    if (!svgRef.current || !containerRef.current) return

    const el = containerRef.current
    const w  = el.clientWidth
    const h  = el.clientHeight
    if (!w || !h) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', w).attr('height', h)

    const projection = d3.geoNaturalEarth1()
      .scale(w / 5.6)
      .translate([w / 2, h / 2])

    const path     = d3.geoPath().projection(projection)
    const features = topojson.feature(world, world.objects.countries).features

    svg.append('path')
      .datum({ type: 'Sphere' })
      .attr('class', 'wm-ocean')
      .attr('d', path)

    svg.append('path')
      .datum(d3.geoGraticule()())
      .attr('class', 'wm-graticule')
      .attr('d', path)

    svg.selectAll('.wm-country')
      .data(features)
      .enter()
      .append('path')
      .attr('class', d => guessedRef.current.has(normId(d.id)) ? 'wm-country wm-guessed' : 'wm-country')
      .attr('data-id', d => normId(d.id))
      .attr('d', path)
  }, [])

  // ── Mount ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadMap()
    return () => {
      clearInterval(timerRef.current)
      clearTimeout(debounceRef.current)
      clearTimeout(fbTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onResize = () => { if (mapDataRef.current) drawMap(mapDataRef.current) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [drawMap])

  // gameState değişince yeni DOM elementine doğru boyutlarla çiz
  useEffect(() => {
    if (!mapDataRef.current) return
    requestAnimationFrame(() => drawMap(mapDataRef.current))
  }, [gameState, drawMap])

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameState !== 'playing') return
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); endGame(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState])

  // ── Harita yükle ──────────────────────────────────────────────────────────
  const loadMap = async () => {
    try {
      const res   = await fetch(MAP_URL)
      const world = await res.json()
      mapDataRef.current = world
      setMapLoaded(true)
      requestAnimationFrame(() => drawMap(world))
    } catch {
      setMapError(true)
    }
  }

  // ── Ülkeyi yeşile boya ────────────────────────────────────────────────────
  const highlightCountry = (countryId) => {
    if (!svgRef.current) return
    d3.select(svgRef.current)
      .selectAll(`[data-id="${normId(countryId)}"]`)
      .classed('wm-guessed', true)
  }

  // ── Feedback ──────────────────────────────────────────────────────────────
  const showFeedback = (type, name) => {
    setFeedback({ type, name })
    clearTimeout(fbTimerRef.current)
    fbTimerRef.current = setTimeout(() => setFeedback(null), 1500)
  }

  // ── Tahmin kontrolü ───────────────────────────────────────────────────────
  const handleGuess = useCallback((raw) => {
    if (!raw || gameState !== 'playing') return
    const input = normalize(raw)
    if (!input) return

    const country = COUNTRIES.find(c =>
      c.names.some(n => normalize(n) === input)
    )
    if (!country) return

    if (guessedRef.current.has(country.id)) return

    guessedRef.current.add(country.id)
    setGuessedCount(guessedRef.current.size)
    if (country.isMapCountry) highlightCountry(country.id)
    showFeedback('success', country.displayName)
    setInputValue('')
  }, [gameState])

  const handleInputChange = (e) => {
    const val = e.target.value
    setInputValue(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => handleGuess(val), 350)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { handleGuess(inputValue); setInputValue('') }
  }

  // ── Oyun başlat ───────────────────────────────────────────────────────────
  const startGame = () => {
    guessedRef.current = new Set()
    setGuessedCount(0)
    setTimeLeft(DURATION)
    setInputValue('')
    setFeedback(null)
    setMissedList([])
    setGameState('playing')
    setTimeout(() => inputRef.current?.focus(), 120)
  }

  // ── Oyunu bitir ───────────────────────────────────────────────────────────
  const endGame = useCallback(() => {
    clearInterval(timerRef.current)
    const missed = COUNTRIES
      .filter(c => !guessedRef.current.has(c.id))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'tr'))
    setMissedList(missed)
    setFinalCount(guessedRef.current.size)
    setGameState('finished')
  }, [])

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const pct       = Math.round((finalCount / TOTAL_COUNTRIES) * 100)
  const shareText = `Dünya Haritası Quizi'nde ${finalCount}/${TOTAL_COUNTRIES} ülkeyi (%${pct}) buldum! 🌍 Sen kaç ülkeyi biliyorsun?`
  const waUrl     = `https://web.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + window.location.href)}`
  const twUrl     = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(window.location.href)}`

  // ══════════════════════════════════════════════════════════════════════════
  // BAŞLANGIÇ EKRANI
  // ══════════════════════════════════════════════════════════════════════════
  if (gameState === 'idle') {
    return (
      <div className="wm-idle-screen">
        <div className="wm-map-bg" ref={containerRef}>
          <svg ref={svgRef} className="wm-svg" />
        </div>
        <div className="wm-overlay">
          <div className="info-card wm-start-card">
            <button className="back-btn solo" onClick={onBack}>← Geri</button>
            <div className="card-icon-lg">🌍</div>
            <h2>Dünya Haritası Quizi</h2>
            <p>
              Aklına gelen tüm ülkeleri yaz — haritada yeşile boyanır.<br />
              <strong>{TOTAL_COUNTRIES} ülke</strong> var, kaçını biliyorsun?
            </p>
            {mapError   && <p className="wm-error">⚠ Harita yüklenemedi. İnternet bağlantını kontrol et.</p>}
            {!mapLoaded && !mapError && <p className="wm-loading">Harita yükleniyor…</p>}
            <button className="btn-primary" onClick={startGame} disabled={!mapLoaded}>Başlat</button>
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SONUÇ EKRANI
  // ══════════════════════════════════════════════════════════════════════════
  if (gameState === 'finished') {
    return (
      <div className="wm-result-screen">
        <div className="wm-map-bg wm-map-bg-dim" ref={containerRef}>
          <svg ref={svgRef} className="wm-svg" />
        </div>
        <div className="wm-overlay">
          <div className="wm-result-card">
            <p className="result-label">Dünya Haritası Quizi — Sonuç</p>
            <div className="wm-big-pct">{pct}<span className="wm-pct-sign">%</span></div>
            <div className="result-stats">
              <div className="stat-item">
                <span className="stat-num" style={{ color: 'var(--green)' }}>{finalCount}</span>
                <span className="stat-label">bulunan</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <span className="stat-num" style={{ color: 'var(--red)' }}>{TOTAL_COUNTRIES - finalCount}</span>
                <span className="stat-label">kaçırılan</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <span className="stat-num">{TOTAL_COUNTRIES}</span>
                <span className="stat-label">toplam</span>
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
              <button className="btn-secondary" onClick={onBack}>Ana Menü</button>
            </div>
            {missedList.length > 0 && (
              <div className="wm-missed-section">
                <p className="wm-missed-title">Kaçırılan Ülkeler ({missedList.length})</p>
                <div className="wm-missed-grid">
                  {missedList.map(c => (
                    <span key={c.id} className="wm-missed-chip">{c.displayName}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // OYUN EKRANI
  // ══════════════════════════════════════════════════════════════════════════
  const timerDanger = timeLeft <= 30
  return (
    <div className="wm-game-screen">

      {/* Üst bar */}
      <div className="top-bar wm-game-bar">
        <button className="back-btn" onClick={() => { clearInterval(timerRef.current); onBack() }}>
          ← Geri
        </button>
        <div className="stats-row">
          <span className="wm-score-badge">
            🌍 <strong>{guessedCount}</strong><span className="wm-score-total">/{TOTAL_COUNTRIES}</span>
          </span>
          <button className="btn-secondary wm-end-btn" onClick={endGame}>Bitir</button>
        </div>
      </div>

      {/* Harita kartı */}
      <div className="wm-map-card" ref={containerRef}>
        <svg ref={svgRef} className="wm-svg" />
        {feedback && (
          <div className={`wm-feedback wm-fb-${feedback.type}`}>
            {feedback.type === 'success'   && `✓ ${feedback.name}`}
            {feedback.type === 'duplicate' && `↩ ${feedback.name} zaten girildi`}
          </div>
        )}
      </div>

      {/* Büyük sayaç */}
      <div className={`wm-big-timer${timerDanger ? ' danger' : ''}`}>
        {formatTime(timeLeft)}
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        className="typing-input wm-game-input"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="ülke adı yaz… (Enter ile gönder)"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
    </div>
  )
}
