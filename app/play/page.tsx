'use client';

import { useMemo, useState } from 'react';
import TurkeyMap from '@/components/TurkeyMap';
import { useGameStore, MAX_PLAYERS } from '@/lib/state';
import { TEAM_PRESETS } from '@/lib/fixtures';

const FALLBACK_COLORS = TEAM_PRESETS.map((team) => team.color);

export default function PlayPage() {
  const cities = useGameStore((state) => state.cities);
  const players = useGameStore((state) => state.players);
  const activePlayerIndex = useGameStore((state) => state.activePlayerIndex);
  const lastSelectedCityCode = useGameStore((state) => state.lastSelectedCityCode);
  const currentQuestion = useGameStore((state) => state.currentQuestion);
  const lastAnswerCorrect = useGameStore((state) => state.lastAnswerCorrect);

  const addPlayer = useGameStore((state) => state.addPlayer);
  const removePlayer = useGameStore((state) => state.removePlayer);
  const startQuestion = useGameStore((state) => state.startQuestion);
  const answerQuestion = useGameStore((state) => state.answerQuestion);
  const setActivePlayer = useGameStore((state) => state.setActivePlayer);
  const resetGame = useGameStore((state) => state.reset);

  const activePlayer = players[activePlayerIndex];

  const [playerName, setPlayerName] = useState('');
  const [playerColor, setPlayerColor] = useState(FALLBACK_COLORS[players.length % FALLBACK_COLORS.length] ?? '#f97316');
  const [hasStarted, setHasStarted] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const canAddMorePlayers = players.length < MAX_PLAYERS;

  const playerCities = useMemo(() => {
    const counts = new Map<string, number>();
    cities.forEach((city) => {
      if (city.ownerTeamId) {
        counts.set(city.ownerTeamId, (counts.get(city.ownerTeamId) ?? 0) + 1);
      }
    });
    return counts;
  }, [cities]);

  const handleSelectCity = (cityCode: string) => {
    if (!activePlayer || !hasStarted || currentQuestion) return;
    startQuestion(cityCode);
    setFeedback(null);
  };

  const handleStartGame = () => {
    if (!players.length) return;
    setHasStarted(true);
  };

  const handleAnswer = (choiceIndex: number) => {
    const wasCorrect = answerQuestion(choiceIndex);
    setFeedback(wasCorrect ? 'Doğru cevap! Bölge takımınıza geçti.' : 'Yanlış cevap. Bölge boyanmadı.');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#031633] via-[#044d81] to-[#0c7ec0] pb-16 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10">
        <header className="flex flex-col gap-4 text-center">
          <p className="text-sm uppercase tracking-[0.4em] text-white/70">Yerel Oyun Modu</p>
          <h1 className="text-3xl font-semibold leading-tight text-white md:text-4xl">
            Tek bilgisayarda Anadolu Hakimiyeti oynayın
          </h1>
          <p className="text-base text-white/80">
            Oyuncuları ekleyin, sırayla haritadan bölgeler seçin ve takım renkleriyle Türkiye haritasını boyayın. Her
            tur seçimi otomatik olarak bir sonraki oyuncuya geçirir.
          </p>
        </header>

        <section className="grid gap-8 rounded-3xl border border-white/25 bg-white/10 p-6 shadow-2xl shadow-black/25 backdrop-blur md:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-6">
            <div className="relative">
              <TurkeyMap
                cities={cities}
                onSelect={handleSelectCity}
                activeCityCode={lastSelectedCityCode}
                disabled={!players.length || !hasStarted}
              />
              {!hasStarted && (
                <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-[#021126]/70 text-center text-sm font-semibold text-white/85 backdrop-blur-sm">
                  Oyuna başlamak için oyuncuları ekleyin ve “Oyuna Başla” butonuna basın.
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/20 bg-white/5 p-4 text-sm text-white/85">
              <div>
                Aktif oyuncu:{' '}
                {activePlayer ? (
                  <span className="font-semibold" style={{ color: activePlayer.color }}>
                    {activePlayer.name}
                  </span>
                ) : (
                  'Oyuncu ekleyin'
                )}
              </div>
              <div className="flex items-center gap-3">
                {!hasStarted && (
                  <button
                    type="button"
                    onClick={handleStartGame}
                    disabled={!players.length}
                    className="rounded-xl border border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white/90 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Oyuna Başla
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    resetGame();
                    setHasStarted(false);
                  }}
                  className="rounded-xl border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white/80 transition hover:bg-white/15"
                >
                  Oyunu Sıfırla
                </button>
              </div>
            </div>

            {currentQuestion && (
              <div className="rounded-2xl border border-white/20 bg-white/10 p-6 text-white shadow-lg">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Soru</p>
                <h3 className="mt-3 text-lg font-semibold text-white">{currentQuestion.prompt}</h3>
                <div className="mt-4 space-y-3">
                  {currentQuestion.choices.map((choice, index) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => handleAnswer(index)}
                      className="w-full rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-left text-sm transition hover:bg-white/20"
                    >
                      <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-xs text-white/80">
                        {index + 1}
                      </span>
                      {choice}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {feedback && !currentQuestion && (
              <div className="rounded-xl border border-white/25 bg-white/10 p-3 text-sm text-white/85">{feedback}</div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-white/20 bg-white/5 p-5 min-h-[320px]">
              <h2 className="text-lg font-semibold text-white">Oyuncular</h2>
              <ul className="mt-4 space-y-3 max-h-[240px] overflow-y-auto pr-2">
                {players.map((player, index) => (
                  <li
                    key={player.id}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
                      index === activePlayerIndex
                        ? 'border-white/40 bg-white/15 text-white'
                        : 'border-white/15 bg-white/5 text-white/85'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-4 w-4 rounded-full shadow" style={{ backgroundColor: player.color }} />
                      <div>
                        <p className="font-semibold">{player.name}</p>
                        <p className="text-xs text-white/60">
                          Bölge: {playerCities.get(player.id) ?? 0}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActivePlayer(index)}
                        className="rounded-lg border border-white/30 px-3 py-1 text-xs text-white/70 hover:bg-white/10"
                      >
                        Sıra
                      </button>
                      {players.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePlayer(player.id)}
                          className="rounded-lg border border-white/30 px-3 py-1 text-xs text-white/70 hover:bg-white/10"
                        >
                          Sil
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/5 p-5">
              <h2 className="text-lg font-semibold text-white">Oyuncu Ekle</h2>
              <form
                className="mt-4 space-y-3 text-sm"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!playerName.trim() || !canAddMorePlayers) return;
                  addPlayer(playerName.trim(), playerColor);
                  const nextIndex = (players.length + 1) % FALLBACK_COLORS.length;
                  setPlayerColor(FALLBACK_COLORS[nextIndex] ?? '#0ea5e9');
                  setPlayerName('');
                }}
              >
                <div className="flex flex-col gap-2">
                  <label className="text-white/70">İsim</label>
                  <input
                    value={playerName}
                    onChange={(event) => setPlayerName(event.target.value)}
                    className="rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-white placeholder-white/40 outline-none focus:border-white/70 disabled:cursor-not-allowed"
                    placeholder="Örn. Takım 1"
                    disabled={!canAddMorePlayers}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-white/70">Renk</label>
                  <input
                    type="color"
                    value={playerColor}
                    onChange={(event) => setPlayerColor(event.target.value)}
                    className="h-10 w-full cursor-pointer rounded-xl border border-white/30 bg-white/20 disabled:cursor-not-allowed"
                    disabled={!canAddMorePlayers}
                  />
                </div>
                <button
                  type="submit"
                  className="mt-3 w-full rounded-xl bg-white/80 px-4 py-2 text-sm font-semibold text-indigo-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canAddMorePlayers}
                >
                  Oyuncu Ekle
                </button>
                {!canAddMorePlayers && (
                  <p className="text-xs text-white/70">En fazla {MAX_PLAYERS} oyuncu ekleyebilirsiniz.</p>
                )}
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
