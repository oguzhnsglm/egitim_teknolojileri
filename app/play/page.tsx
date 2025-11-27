'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import TurkeyMap from '@/components/TurkeyMap';
import { useGameStore, type GameLengthId } from '@/lib/state';
import { TEAM_PRESETS } from '@/lib/fixtures';
import { PROVINCE_TO_REGION } from '@/lib/regions';

const FALLBACK_COLORS = TEAM_PRESETS.map((team) => team.color);
const GAME_LENGTH_OPTIONS = [
  { id: 'short', label: 'Kısa', description: '3 round', rounds: 3 },
  { id: 'normal', label: 'Normal', description: '5 round', rounds: 5 },
  { id: 'long', label: 'Uzun', description: '7 round', rounds: 7 },
] as const;
const REQUIRED_PLAYER_COUNT = 4;

const createDefaultNames = (count: number) => Array.from({ length: count }, (_, index) => `Oyuncu ${index + 1}`);
const CUSTOM_COLORS = [
  '#f43f5e',
  '#f97316',
  '#facc15',
  '#22c55e',
  '#14b8a6',
  '#0ea5e9',
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#94a3b8',
] as const;

const createDefaultColors = (count: number) =>
  Array.from({ length: count }, (_, index) => CUSTOM_COLORS[index % CUSTOM_COLORS.length] ?? '#f97316');
const QUESTION_DURATION_SECONDS = 60;

export default function PlayPage() {
  const cities = useGameStore((state) => state.cities);
  const players = useGameStore((state) => state.players);
  const activePlayerIndex = useGameStore((state) => state.activePlayerIndex);
  const lastSelectedCityCode = useGameStore((state) => state.lastSelectedCityCode);
  const currentQuestion = useGameStore((state) => state.currentQuestion);
  const lastAnswerCorrect = useGameStore((state) => state.lastAnswerCorrect);
  const roundsPlayed = useGameStore((state) => state.roundsPlayed);
  const gameRoundTarget = useGameStore((state) => state.gameRoundTarget);
  const storedGameLength = useGameStore((state) => state.gameLength);
  const lastEliminatedPlayerName = useGameStore((state) => state.lastEliminatedPlayerName);
  const lastEliminatedCityCode = useGameStore((state) => state.lastEliminatedCityCode);
  const contestCityCode = useGameStore((state) => state.contestCityCode);

  const startQuestion = useGameStore((state) => state.startQuestion);
  const answerQuestion = useGameStore((state) => state.answerQuestion);
  const initializeGame = useGameStore((state) => state.initializeGame);
  const loadMapCities = useGameStore((state) => state.loadMapCities);
  const pendingContestCity = useGameStore((state) => state.pendingContestCityCode);
  const setPendingContestCity = useGameStore((state) => state.setPendingContestCity);

  const activePlayer = players[activePlayerIndex];

  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [showStartInfo, setShowStartInfo] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [playerNames, setPlayerNames] = useState<string[]>(() => createDefaultNames(REQUIRED_PLAYER_COUNT));
  const [playerColors, setPlayerColors] = useState<string[]>(() => createDefaultColors(REQUIRED_PLAYER_COUNT));
  const [selectedGameLength, setSelectedGameLength] = useState<GameLengthId>('normal');
  const [questionTimer, setQuestionTimer] = useState<number | null>(null);
  const questionStartRef = useRef<number | null>(null);
  const [openColorPickerIndex, setOpenColorPickerIndex] = useState<number | null>(null);
  const [provinceMap, setProvinceMap] = useState<Record<string, string>>(PROVINCE_TO_REGION);

  const setupGameLengthMeta = GAME_LENGTH_OPTIONS.find((option) => option.id === selectedGameLength);
  const runningGameLengthMeta = GAME_LENGTH_OPTIONS.find((option) => option.id === storedGameLength);
  const visibleGameLengthMeta = isSetupComplete ? runningGameLengthMeta : setupGameLengthMeta;

  const allPlayerNamesReady = playerNames.every((name) => name.trim().length > 0);

  const lastEliminatedCityName = useMemo(() => {
    if (!lastEliminatedCityCode) return null;
    const city = cities.find((candidate) => candidate.code === lastEliminatedCityCode);
    return city?.name ?? null;
  }, [cities, lastEliminatedCityCode]);

  const targetCity = useMemo(() => {
    if (!contestCityCode) return null;
    return cities.find((city) => city.code === contestCityCode) ?? null;
  }, [cities, contestCityCode]);
  const pendingTargetCity = useMemo(() => {
    if (!pendingContestCity) return null;
    return cities.find((city) => city.code === pendingContestCity) ?? null;
  }, [cities, pendingContestCity]);

  const handleSelectCity = (cityCode: string) => {
    if (!activePlayer || !isSetupComplete || currentQuestion || showStartInfo) return;
    if (contestCityCode) return;
    if (pendingContestCity) return;
    setPendingContestCity(cityCode);
    setFeedback(null);
  };

  const handlePlayerNameChange = (index: number, value: string) => {
    setPlayerNames((prev) => prev.map((name, idx) => (idx === index ? value : name)));
  };

  const handlePlayerColorChange = (index: number, value: string) => {
    setPlayerColors((prev) => prev.map((color, idx) => (idx === index ? value : color)));
    setOpenColorPickerIndex(null);
  };

  const handleBeginGame = () => {
    if (!allPlayerNamesReady || !setupGameLengthMeta) return;
    const preparedPlayers = playerNames.map((name, index) => ({
      id: `P${Date.now()}-${index}`,
      name: name.trim(),
      color: playerColors[index] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length] ?? '#f97316',
      score: 0,
    }));
    initializeGame(preparedPlayers, selectedGameLength, setupGameLengthMeta.rounds);
    setIsSetupComplete(true);
    setFeedback(null);
    setShowStartInfo(true);
  };

  const handleAnswer = (choiceIndex: number, feedbackOverride?: string) => {
    if (!contestCityCode && !pendingContestCity) return;
    const now = Date.now();
    const durationMs = questionStartRef.current ? now - questionStartRef.current : undefined;
    const wasCorrect = answerQuestion(choiceIndex, durationMs);
    setFeedback(feedbackOverride ?? (wasCorrect ? 'Doğru cevap' : 'Yanlış cevap'));
    setQuestionTimer(null);
    questionStartRef.current = null;
  };

  const currentRoundDisplay =
    isSetupComplete && gameRoundTarget
      ? `${Math.min(roundsPlayed + 1, gameRoundTarget).toString().padStart(1, '0')} / ${gameRoundTarget}`
      : null;

  useEffect(() => {
    if (!currentQuestion) {
      setQuestionTimer(null);
      return;
    }
    questionStartRef.current = Date.now();
    setQuestionTimer(QUESTION_DURATION_SECONDS);
    const intervalId = setInterval(() => {
      setQuestionTimer((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          clearInterval(intervalId);
          handleAnswer(-1, 'Süre doldu');
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion]);

  useEffect(() => {
    fetch('/api/get-map-config')
      .then((res) => res.json())
      .then((config) => {
        const regionEntries = Object.values(config?.regions ?? {}) as Array<{
          name: string;
          color: string;
          cities: string[];
        }>;
        if (!regionEntries.length) return;
        const newCities = regionEntries.map((region, index) => ({
          id: `CUSTOM-${index}-${region.name}`,
          code: `CUSTOM-${index}-${region.name}`.replace(/\s+/g, '-').toUpperCase(),
          name: region.name,
          region: region.name,
        }));
        const mergedMap: Record<string, string> = { ...PROVINCE_TO_REGION };
        regionEntries.forEach((region, idx) => {
          const regionCode = newCities[idx].code;
          region.cities.forEach((cityCode) => {
            mergedMap[cityCode] = regionCode;
          });
        });
        loadMapCities(newCities);
        setProvinceMap(mergedMap);
      })
      .catch((error) => {
        console.error('Custom map load failed', error);
      });
  }, [loadMapCities]);

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-[#031633] via-[#044d81] to-[#0c7ec0] pb-6 text-white">
      <div className="pointer-events-none absolute left-6 top-4 z-50">
        <a
          href="/map-selector"
          className="pointer-events-auto rounded-full border border-white/40 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/80 transition hover:bg-white/20"
        >
          Haritalarım
        </a>
      </div>
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-6 py-4">
        {!isSetupComplete && (
          <header className="flex flex-col gap-4 text-center">
            <p className="text-sm uppercase tracking-[0.4em] text-white/70">Yerel Oyun Modu</p>
            <h1 className="text-3xl font-semibold leading-tight text-white md:text-4xl">
              Tek bilgisayarda Anadolu Hakimiyeti oynayın
            </h1>
            <p className="text-base text-white/80">
              Oyuna başlamadan önce 4 oyuncuyu belirleyin, oyun uzunluğunu seçin ve sırayla soruları cevaplayarak haritayı
              boyayın.
            </p>
          </header>
        )}

        {isSetupComplete ? (
          <section className="relative h-[calc(100vh-100px)] min-h-[580px] overflow-hidden rounded-[40px] border border-white/25 bg-[#010f26]/70 shadow-2xl shadow-black/40">
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <TurkeyMap
                cities={cities}
                onSelect={handleSelectCity}
                activeCityCode={lastSelectedCityCode}
                disabled={!players.length || Boolean(currentQuestion) || showStartInfo}
                provinceToRegionMap={provinceMap}
              />
            </div>
            <div className="pointer-events-none absolute left-1/2 top-6 z-20 -translate-x-1/2 rounded-3xl border border-white/20 bg-[#041633]/95 px-6 py-3 text-base font-semibold text-white/90 shadow-lg">
              {targetCity
                ? `Hedef Bölge: ${targetCity.name}`
                : pendingTargetCity
                  ? `Hedef Seçildi: ${pendingTargetCity.name}`
                  : 'Haritadan bir hedef seçin'}
            </div>

            {showStartInfo && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#010a1b]/90 px-6 text-center">
                <div className="w-full max-w-md space-y-4 rounded-3xl border border-white/20 bg-white/5 p-6 text-white">
                  <h3 className="text-2xl font-semibold">Oyun Başlıyor!</h3>
                  <p className="text-sm text-white/85">
                    Sırayla bölgeleri seçin, her soru sonrasında sıra otomatik olarak değişir. Round tamamlandığında seçtiğiniz
                    mod kuralına göre bir oyuncu bulunduğu bölgeden elenir.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowStartInfo(false)}
                    className="w-full rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-[#052049] transition hover:bg-white"
                  >
                    Tamam, Başlayalım
                  </button>
                </div>
              </div>
            )}

            <div className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex justify-center px-6">
              <div className="w-full max-w-xl rounded-3xl border border-white/30 bg-[#011839]/90 p-5 text-left shadow-2xl">
                {pendingContestCity && !currentQuestion ? (
                  <div className="space-y-4 text-center text-white">
                    <div className="text-sm uppercase tracking-[0.4em] text-white/60">Sıradaki Oyuncu</div>
                    <p className="text-xl font-semibold">
                      {activePlayer ? activePlayer.name : 'Oyuncu seçiliyor'}
                    </p>
                    <button
                      type="button"
                      className="pointer-events-auto inline-flex w-full items-center justify-center rounded-2xl border border-white/30 px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/15"
                      onClick={() => startQuestion(pendingContestCity)}
                    >
                      Devam Et
                    </button>
                  </div>
                ) : currentQuestion ? (
                  <>
                    <div className="flex items-center justify-between text-white/80">
                      <p className="text-[11px] uppercase tracking-[0.4em] text-white/60">
                        {activePlayer ? `${activePlayer.name} için soru` : 'Soru'}
                      </p>
                      <span className="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold">
                        {questionTimer ?? '--'} sn
                      </span>
                    </div>
                    <p className="mt-2 text-lg font-semibold text-white">{currentQuestion.prompt}</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {currentQuestion.choices.map((choice, index) => (
                        <button
                          key={choice}
                          type="button"
                          onClick={() => handleAnswer(index)}
                          className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-left text-sm text-white transition hover:bg-white/20"
                        >
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white/85">
                            {index + 1}
                          </span>
                          {choice}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-center text-sm text-white/70">Haritadan bir bölge seçildiğinde soru burada görünecek.</p>
                )}
              </div>
            </div>

            <aside className="absolute top-6 right-6 z-40 w-64 space-y-4 rounded-2xl border border-white/20 bg-[#041633]/90 p-4 text-xs text-white/75">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.35em] text-white/50">
                <span>{visibleGameLengthMeta?.label} Mod</span>
                {currentRoundDisplay && <span>Round {currentRoundDisplay}</span>}
              </div>
              <ul className="space-y-2">
                {players.map((player, index) => {
                  const isActive = index === activePlayerIndex;
                  return (
                    <li
                      key={player.id}
                      className={`flex items-center justify-between rounded-2xl border px-3 py-2 transition ${
                        isActive
                          ? 'border-white/70 bg-white/15 text-white shadow-[0_0_12px_rgba(255,255,255,0.25)]'
                          : 'border-white/15 bg-white/5 text-white/75'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: player.color, boxShadow: isActive ? '0 0 10px currentColor' : 'none' }}
                        />
                        <span className="text-sm font-semibold">{player.name}</span>
                      </div>
                      <span className="text-[11px] text-white/60">{player.score}</span>
                    </li>
                  );
                })}
              </ul>
            </aside>

            {feedback && !currentQuestion && (
              <div
                className={`pointer-events-none absolute left-1/2 top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-4 rounded-[42px] border-4 px-16 py-10 text-3xl font-black uppercase tracking-widest shadow-[0_28px_75px_rgba(0,0,0,0.7)] ${
                  lastAnswerCorrect
                    ? 'border-emerald-200/80 bg-gradient-to-b from-emerald-500/50 to-emerald-700/50 text-emerald-100'
                    : 'border-rose-200/80 bg-gradient-to-b from-rose-500/50 to-rose-800/50 text-rose-100'
                }`}
              >
                <span
                  className={`flex h-16 w-16 items-center justify-center rounded-full text-5xl shadow-[0_0_30px_rgba(0,0,0,0.45)] ${
                    lastAnswerCorrect ? 'bg-emerald-600/80' : 'bg-rose-600/80'
                  }`}
                >
                  {lastAnswerCorrect ? '✓' : '✕'}
                </span>
                <span className="drop-shadow-[0_0_28px_rgba(0,0,0,0.45)]">{feedback}</span>
              </div>
            )}

            {lastEliminatedPlayerName && (
              <div className="pointer-events-none absolute bottom-8 right-6 z-30 rounded-2xl border border-amber-400/50 bg-amber-300/20 px-4 py-3 text-xs font-semibold text-amber-50 shadow-2xl">
                {lastEliminatedPlayerName}{' '}
                {lastEliminatedCityName ? `${lastEliminatedCityName} bölgesinde` : 'seçilen bölgede'} elendi.
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-8 rounded-3xl border border-white/25 bg-white/10 p-6 text-white shadow-2xl shadow-black/25 backdrop-blur">
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-6 rounded-3xl border border-white/20 bg-white/5 p-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/70">Adım 1</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Oyuncu isimleri</h2>
                  <p className="text-sm text-white/70">Bu modda 4 oyuncu zorunludur.</p>
                </div>
                <div className="space-y-3">
                  {playerNames.map((name, index) => (
                    <div key={`player-name-${index}`} className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">
                        Oyuncu {index + 1}
                      </label>
                      <div className="relative flex items-center gap-3">
                        <input
                          value={name}
                          onChange={(event) => handlePlayerNameChange(index, event.target.value)}
                          placeholder={`Takım ${index + 1}`}
                          className="w-full rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/40 outline-none transition focus:border-white/80"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setOpenColorPickerIndex((prev) => (prev === index ? null : index))
                          }
                          className="h-10 w-10 rounded-xl border border-white/30 bg-white/10 p-1"
                          aria-label={`Renk seçimi ${index + 1}`}
                        >
                          <span className="block h-full w-full rounded-lg" style={{ backgroundColor: playerColors[index] }} />
                        </button>
                        {openColorPickerIndex === index && (
                          <div className="absolute right-0 top-12 z-10 grid grid-cols-5 gap-1 rounded-2xl border border-white/30 bg-[#040b1a]/95 p-3">
                            {CUSTOM_COLORS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => handlePlayerColorChange(index, color)}
                                className={`h-6 w-6 rounded-full border-2 transition ${
                                  playerColors[index] === color
                                    ? 'border-white shadow-lg'
                                    : 'border-white/20 opacity-80'
                                }`}
                                style={{ backgroundColor: color }}
                                aria-label={`Renk ${color}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6 rounded-3xl border border-white/20 bg-white/5 p-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/70">Adım 2</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Oyun uzunluğu</h2>
                  <p className="text-sm text-white/70">Hangi round sayısıyla oynanacağına karar verin.</p>
                </div>
                <div className="space-y-3">
                  {GAME_LENGTH_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedGameLength(option.id)}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${
                        option.id === selectedGameLength
                          ? 'border-white/70 bg-white/20 text-white'
                          : 'border-white/20 bg-white/5 text-white/70 hover:border-white/40 hover:bg-white/10'
                      }`}
                    >
                      <span>
                        <span className="text-lg font-semibold">{option.label}</span>
                        <span className="block text-xs uppercase tracking-[0.3em] text-white/60">{option.description}</span>
                      </span>
                      <span className="text-sm text-white/60">{option.rounds} soru</span>
                    </button>
                  ))}
                </div>
                <div className="rounded-2xl border border-white/20 bg-[#03142d]/60 p-4 text-sm text-white/80">
                  <p>Her round sonrası elenme kuralı seçtiğiniz oyun uzunluğuna göre otomatik işler.</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/20 bg-white/5 p-5">
              <div className="text-sm text-white/80">
                Oyuncu sayısı: {REQUIRED_PLAYER_COUNT} - Seçilen oyun uzunluğu: {setupGameLengthMeta?.label}
              </div>
              <button
                type="button"
                onClick={handleBeginGame}
                disabled={!allPlayerNamesReady}
                className="rounded-2xl bg-white/90 px-6 py-3 text-sm font-semibold text-[#052049] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Oyuna Başla
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
