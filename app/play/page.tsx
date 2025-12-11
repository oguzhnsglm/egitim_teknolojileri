'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import TurkeyMap from '@/components/TurkeyMap';
import { useGameStore, type GameLengthId, createQuestionPool, type LocalQuestion } from '@/lib/state';
import { TEAM_PRESETS } from '@/lib/fixtures';
import { PROVINCE_TO_REGION, REGION_BY_CODE, type RegionCode } from '@/lib/regions';

const FALLBACK_COLORS = TEAM_PRESETS.map((team) => team.color);
const REQUIRED_PLAYER_COUNT = 4;
const SUBJECT_OPTIONS = [
  { id: 'math', label: 'Matematik' },
  { id: 'turkish', label: 'Türkçe' },
  { id: 'history', label: 'Tarih' },
  { id: 'culture', label: 'Genel Kültür' },
  { id: 'geography', label: 'Coğrafya' },
] as const;
const GAME_LENGTH_OPTIONS = [
  { id: 'short', label: 'Kısa', description: '3 round', rounds: 3 },
  { id: 'normal', label: 'Normal', description: '5 round', rounds: 5 },
  { id: 'long', label: 'Uzun', description: '7 round', rounds: 7 },
] as const;

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
  const roundTurns = useGameStore((state) => state.roundTurns);
  const gameRoundTarget = useGameStore((state) => state.gameRoundTarget);
  const storedGameLength = useGameStore((state) => state.gameLength);
  const lastEliminatedPlayerName = useGameStore((state) => state.lastEliminatedPlayerName);
  const lastEliminatedCityCode = useGameStore((state) => state.lastEliminatedCityCode);
  const contestCityCode = useGameStore((state) => state.contestCityCode);

  const startQuestion = useGameStore((state) => state.startQuestion);
  const answerQuestion = useGameStore((state) => state.answerQuestion);
  const initializeGame = useGameStore((state) => state.initializeGame);
  const loadMapCities = useGameStore((state) => state.loadMapCities);
  const setQuestionBank = useGameStore((state) => state.setQuestionBank);
  const pendingContestCity = useGameStore((state) => state.pendingContestCityCode);
  const setPendingContestCity = useGameStore((state) => state.setPendingContestCity);

  const activePlayer = players[activePlayerIndex];

  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [showStartInfo, setShowStartInfo] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [playerNames, setPlayerNames] = useState<string[]>(() => createDefaultNames(REQUIRED_PLAYER_COUNT));
  const [playerColors, setPlayerColors] = useState<string[]>(() => createDefaultColors(REQUIRED_PLAYER_COUNT));
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedGameLength, setSelectedGameLength] = useState<GameLengthId>('normal');
  const [questionTimer, setQuestionTimer] = useState<number | null>(null);
  const questionStartRef = useRef<number | null>(null);
  const regionTieSpinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const regionTieResolveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [openColorPickerIndex, setOpenColorPickerIndex] = useState<number | null>(null);
  const [provinceMap, setProvinceMap] = useState<Record<string, string>>(PROVINCE_TO_REGION);
  const [isRegionVoteActive, setIsRegionVoteActive] = useState(false);
  const [playerRegionVotes, setPlayerRegionVotes] = useState<Record<string, string | null>>({});
  const [activeRegionVoterId, setActiveRegionVoterId] = useState<string | null>(null);
  const [regionVoteResult, setRegionVoteResult] = useState<string | null>(null);
  const [regionVoteCompleted, setRegionVoteCompleted] = useState(false);
  const [regionVoteTieCandidates, setRegionVoteTieCandidates] = useState<string[]>([]);
  const [isRegionTieSpinning, setIsRegionTieSpinning] = useState(false);
  const [regionTieWinner, setRegionTieWinner] = useState<string | null>(null);
  const [showRegionResultModal, setShowRegionResultModal] = useState(false);
  const fallbackQuestionsRef = useRef<LocalQuestion[]>(createQuestionPool());
  const [remoteQuestionBank, setRemoteQuestionBank] = useState<LocalQuestion[] | null>(null);
  const [questionLoadError, setQuestionLoadError] = useState<string | null>(null);
  const [isQuestionBankLoading, setIsQuestionBankLoading] = useState(true);
  const [signupForm, setSignupForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    organization: '',
  });
  const [signupStatus, setSignupStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSignupSubmitting, setIsSignupSubmitting] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const lastModalCityRef = useRef<string | null>(null);
  const shouldShowRegionVoteOverlay = isRegionVoteActive && !pendingContestCity && !contestCityCode && !currentQuestion;

  const setupGameLengthMeta = GAME_LENGTH_OPTIONS.find((option) =>
    isSetupComplete ? option.id === storedGameLength : option.id === selectedGameLength,
  );
  const runningGameLengthMeta = GAME_LENGTH_OPTIONS.find((option) => option.id === storedGameLength);
  const visibleGameLengthMeta = isSetupComplete ? runningGameLengthMeta : setupGameLengthMeta;

  const allPlayerNamesReady = playerNames.every((name) => name.trim().length > 0);
  const selectedSubjectLabels = SUBJECT_OPTIONS.filter((option) => selectedSubjects.includes(option.id)).map((option) => option.label);
  const canStartGame = allPlayerNamesReady && selectedSubjects.length > 0;
  const isSignupReady = Boolean(
    signupForm.firstName.trim() && signupForm.lastName.trim() && signupForm.email.trim() && signupForm.password.trim(),
  );

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
  const cityNameByCode = useMemo(() => {
    const map: Record<string, string> = {};
    cities.forEach((city) => {
      map[city.code] = city.name ?? city.region ?? city.code;
    });
    return map;
  }, [cities]);

  const selectedVoteCity = useMemo(() => {
    if (!regionVoteResult) return null;
    return cities.find((city) => city.code === regionVoteResult) ?? null;
  }, [cities, regionVoteResult]);

  const getRegionDisplayName = useCallback(
    (code?: string | null) => {
      if (!code) return null;
      return cityNameByCode[code] ?? REGION_BY_CODE[code as RegionCode]?.name ?? null;
    },
    [cityNameByCode],
  );

  const targetCityName = targetCity?.name ?? getRegionDisplayName(contestCityCode);
  const pendingTargetCityName = pendingTargetCity?.name ?? getRegionDisplayName(pendingContestCity);
  const selectedVoteCityName = selectedVoteCity?.name ?? getRegionDisplayName(regionVoteResult);

  const getPreparedQuestionBank = useCallback(() => {
    const available = remoteQuestionBank && remoteQuestionBank.length ? remoteQuestionBank : fallbackQuestionsRef.current;
    if (!selectedSubjects.length) {
      return available;
    }
    const filter = new Set(selectedSubjects);
    const filtered = available.filter((question) => {
      if (!question.subjectIds?.length) return true;
      return question.subjectIds.some((subject) => filter.has(subject));
    });
    return filtered.length ? filtered : available;
  }, [remoteQuestionBank, selectedSubjects]);

  const handlePlayerNameChange = (index: number, value: string) => {
    setPlayerNames((prev) => prev.map((name, idx) => (idx === index ? value : name)));
  };

  const handlePlayerColorChange = (index: number, value: string) => {
    setPlayerColors((prev) => prev.map((color, idx) => (idx === index ? value : color)));
    setOpenColorPickerIndex(null);
  };

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects((prev) => (prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]));
  };

  const openSignupForm = () => {
    setIsSignupOpen(true);
  };

  const closeSignupForm = () => {
    setIsSignupOpen(false);
  };

  const handleSignupInputChange = (field: keyof typeof signupForm, value: string) => {
    setSignupForm((prev) => ({ ...prev, [field]: value }));
    setSignupStatus(null);
  };


  const handleSignupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSignupReady) {
      setSignupStatus({ type: 'error', message: 'L?tfen ad, soyad, Gmail ve ?ifre alanlar?n? doldurun.' });
      return;
    }
    if (!signupForm.email.toLowerCase().endsWith('@gmail.com')) {
      setSignupStatus({ type: 'error', message: 'Kay?t i?in l?tfen bir Gmail adresi kullan?n.' });
      return;
    }
    if (signupForm.password.length < 8) {
      setSignupStatus({ type: 'error', message: '?ifre en az 8 karakter olmal?d?r.' });
      return;
    }
    setIsSignupSubmitting(true);
    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupForm),
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !payload?.success) {
        setSignupStatus({ type: 'error', message: payload?.error ?? 'Kay?t s?ras?nda bir hata olu?tu.' });
        return;
      }
      setSignupStatus({
        type: 'success',
        message: 'Kayd?n?z al?nd?! Gmail kutunuzu kontrol etmeyi unutmay?n.',
      });
      setSignupForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        organization: '',
      });
      setTimeout(() => {
        closeSignupForm();
        setSignupStatus(null);
      }, 1500);
    } catch (error) {
      console.error('signup error', error);
      setSignupStatus({ type: 'error', message: 'Kay?t iste?i g?nderilemedi.' });
    } finally {
      setIsSignupSubmitting(false);
    }
  };

  const handleBeginGame = () => {
    if (!allPlayerNamesReady || !selectedSubjects.length) return;
    const questionBank = getPreparedQuestionBank();
    setQuestionBank(questionBank);
    const gameLengthMeta = setupGameLengthMeta ?? GAME_LENGTH_OPTIONS.find((option) => option.id === 'normal')!;
    const preparedPlayers = playerNames.map((name, index) => ({
      id: `P${Date.now()}-${index}`,
      name: name.trim(),
      color: playerColors[index] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length] ?? '#f97316',
      score: 0,
    }));
    initializeGame(preparedPlayers, storedGameLength, gameLengthMeta.rounds);
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

  useEffect(() => {
    let cancelled = false;
    const loadSupabaseQuestions = async () => {
      setIsQuestionBankLoading(true);
      try {
        const response = await fetch('/api/supabase-questions');
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }
        const payload = await response.json();
        if (cancelled) return;
        const questions = Array.isArray(payload.questions) ? (payload.questions as LocalQuestion[]) : [];
        if (questions.length) {
          setRemoteQuestionBank(questions);
          setQuestionLoadError(null);
        } else {
          setRemoteQuestionBank(null);
          setQuestionLoadError(payload.error ?? 'Soru bulunamadi.');
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Supabase question fetch failed', error);
          setQuestionLoadError('Supabase sorulari yuklenemedi, yerel sorular kullanilacak.');
        }
      } finally {
        if (!cancelled) {
          setIsQuestionBankLoading(false);
        }
      }
    };
    loadSupabaseQuestions();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSetupComplete) {
      setIsRegionVoteActive(false);
      setRegionVoteCompleted(false);
      setRegionVoteResult(null);
      setRegionVoteTieCandidates([]);
      setRegionTieWinner(null);
      setPlayerRegionVotes({});
      setActiveRegionVoterId(null);
      return;
    }
    setPlayerRegionVotes(() => {
      const initial: Record<string, string | null> = {};
      players.forEach((player) => {
        initial[player.id] = null;
      });
      return initial;
    });
  }, [isSetupComplete, players]);

  useEffect(() => {
    if (!players.length) {
      setActiveRegionVoterId(null);
      return;
    }
    setActiveRegionVoterId((current) => {
      if (current && players.some((player) => player.id === current)) {
        return current;
      }
      return players[0]?.id ?? null;
    });
  }, [players]);

  useEffect(() => {
    if (isSetupComplete && !showStartInfo && !regionVoteCompleted && roundTurns === 0) {
      setIsRegionVoteActive(true);
    }
  }, [isSetupComplete, showStartInfo, regionVoteCompleted, roundTurns]);

  useEffect(() => {
    return () => {
      if (regionTieSpinTimeoutRef.current) {
        clearTimeout(regionTieSpinTimeoutRef.current);
      }
      if (regionTieResolveTimeoutRef.current) {
        clearTimeout(regionTieResolveTimeoutRef.current);
      }
    };
  }, []);

  const regionVoteSummary = useMemo(() => {
    const votesPlaced = players.reduce((count, player) => count + (playerRegionVotes[player.id] ? 1 : 0), 0);
    const totalVotes = players.length;
    const allVoted = Boolean(totalVotes) && votesPlaced === totalVotes;
    const tallies = new Map<string, number>();
    players.forEach((player) => {
      const vote = playerRegionVotes[player.id];
      if (vote) {
        tallies.set(vote, (tallies.get(vote) ?? 0) + 1);
      }
    });
    let maxVotes = 0;
    const topCities: string[] = [];
    tallies.forEach((count, cityCode) => {
      if (count > maxVotes) {
        maxVotes = count;
        topCities.length = 0;
        topCities.push(cityCode);
      } else if (count === maxVotes) {
        topCities.push(cityCode);
      }
    });
    return { votesPlaced, allVoted, topCities };
  }, [players, playerRegionVotes]);

  const handleRegionCardSelect = useCallback(
    (cityCode: string) => {
      if (!activeRegionVoterId || regionVoteSummary.allVoted) return;
      setPlayerRegionVotes((prev) => {
        const currentChoice = prev[activeRegionVoterId];
        const nextChoice = currentChoice === cityCode ? null : cityCode;
        const next = { ...prev, [activeRegionVoterId]: nextChoice };
        if (nextChoice) {
          const pendingPlayer = players.find((player) => !next[player.id]);
          if (pendingPlayer && pendingPlayer.id !== activeRegionVoterId) {
            setActiveRegionVoterId(pendingPlayer.id);
          }
        }
        return next;
      });
    },
    [activeRegionVoterId, players, regionVoteSummary.allVoted],
  );

  const handleSelectCity = (cityCode: string) => {
    if (!shouldShowRegionVoteOverlay) return;
    if (isRegionVoteActive && !regionVoteCompleted) {
      handleRegionCardSelect(cityCode);
      return;
    }
    if (!activePlayer || !isSetupComplete || currentQuestion || showStartInfo) return;
    if (contestCityCode) return;
    if (pendingContestCity) return;
    setPendingContestCity(cityCode);
    setFeedback(null);
    setShowRegionResultModal(true);
  };

  const finalizeRegionVote = useCallback(
    (winningCityCode: string) => {
      setRegionVoteResult(winningCityCode);
      setRegionVoteCompleted(true);
      setIsRegionVoteActive(false);
      setRegionVoteTieCandidates([]);
      setRegionTieWinner(null);
      setPendingContestCity(winningCityCode);
      setFeedback(null);
      setShowRegionResultModal(true);
    },
    [setPendingContestCity, setFeedback],
  );

  useEffect(() => {
    if (!isRegionVoteActive) return;
    if (!regionVoteSummary.allVoted) return;
    if (!regionVoteSummary.topCities.length) return;
    if (regionVoteSummary.topCities.length === 1) {
      finalizeRegionVote(regionVoteSummary.topCities[0]);
      return;
    }
    if (regionVoteTieCandidates.length) return;
    setRegionVoteTieCandidates(regionVoteSummary.topCities);
    setIsRegionTieSpinning(true);
    if (regionTieSpinTimeoutRef.current) {
      clearTimeout(regionTieSpinTimeoutRef.current);
    }
    if (regionTieResolveTimeoutRef.current) {
      clearTimeout(regionTieResolveTimeoutRef.current);
    }
    regionTieSpinTimeoutRef.current = setTimeout(() => {
      const winner =
        regionVoteSummary.topCities[Math.floor(Math.random() * regionVoteSummary.topCities.length)];
      setRegionTieWinner(winner);
      setIsRegionTieSpinning(false);
      regionTieResolveTimeoutRef.current = setTimeout(() => {
        finalizeRegionVote(winner);
      }, 1500);
    }, 2000);
  }, [
    finalizeRegionVote,
    isRegionVoteActive,
    regionVoteSummary.allVoted,
    regionVoteSummary.topCities,
    regionVoteTieCandidates.length,
  ]);

  useEffect(() => {
    if (!isSetupComplete) return;
    if (!regionVoteCompleted) return;
    if (isRegionVoteActive) return;
    if (pendingContestCity || contestCityCode || currentQuestion) return;
    if (roundTurns !== 0) return;
    setRegionVoteCompleted(false);
    setRegionVoteResult(null);
    setPlayerRegionVotes(() => {
      const initial: Record<string, string | null> = {};
      players.forEach((player) => {
        initial[player.id] = null;
      });
      return initial;
    });
    setActiveRegionVoterId(players[0]?.id ?? null);
  }, [
    contestCityCode,
    currentQuestion,
    isRegionVoteActive,
    isSetupComplete,
    pendingContestCity,
    players,
    regionVoteCompleted,
    roundTurns,
  ]);

  useEffect(() => {
    const activeCityCode = pendingContestCity ?? regionVoteResult ?? null;
    if (activeCityCode && activeCityCode !== lastModalCityRef.current && !currentQuestion) {
      setShowRegionResultModal(true);
      lastModalCityRef.current = activeCityCode;
    }
    if (!activeCityCode) {
      setShowRegionResultModal(false);
    }
  }, [pendingContestCity, regionVoteResult, currentQuestion]);

  return (
    <>
      <main className="relative min-h-screen bg-gradient-to-b from-[#031633] via-[#044d81] to-[#0c7ec0] pb-6 text-white">
      <div className="pointer-events-none absolute left-6 top-4 z-50">
        <a
          href="/map-selector"
          className="pointer-events-auto rounded-full border border-white/40 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/80 transition hover:bg-white/20"
        >
          Haritalarım
        </a>
      </div>
      {!isSetupComplete && (
        <div className="pointer-events-none absolute right-6 top-4 z-50">
          <button
            type="button"
            onClick={openSignupForm}
            className="pointer-events-auto rounded-full border border-white/70 bg-white/20 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.4em] text-white transition hover:bg-white/40"
          >
            Kaydolun
          </button>
        </div>
      )}
            <div
        className={`mx-auto flex w-full flex-col gap-8 px-6 py-4 ${
          isSetupComplete ? 'max-w-[1500px]' : 'max-w-[1100px]'
        }`}
      >
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
                disabled={!players.length || Boolean(currentQuestion) || showStartInfo || !shouldShowRegionVoteOverlay}
                provinceToRegionMap={provinceMap}
              />
            </div>
            <div className="pointer-events-none absolute left-1/2 top-5 z-20 -translate-x-1/2 rounded-2xl border border-white/15 bg-[#041633]/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/80 shadow-lg">
              {targetCityName
                ? `Hedef Bölge: ${targetCityName}`
                : pendingTargetCityName
                  ? `Hedef Seçildi: ${pendingTargetCityName}`
                  : selectedVoteCityName
                    ? `Seçilen Bölge: ${selectedVoteCityName}`
                    : 'Henüz bir bölge seçilmedi'}
            </div>
            {shouldShowRegionVoteOverlay && (
              <>
                <div className="pointer-events-none absolute inset-0 z-30 bg-[#010a1b]/60" />
                <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center px-4">
                  <div className="pointer-events-auto w-full max-w-md rounded-3xl border border-white/20 bg-[#050d1f]/70 px-6 py-6 text-white shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
                    <div className="text-center text-[11px] uppercase tracking-[0.4em] text-white/60">Bölge Seçimi</div>
                    <h3 className="mt-3 text-2xl font-semibold text-white">Bölge Seçin</h3>
                    <p className="mt-2 text-xs text-white/70">
                      Haritada bir bölgeye tıklayarak oyuncular oy veriyor. Her oy sonrası sıra otomatik ilerler.
                    </p>
                    <div className="mt-3 text-center text-[10px] uppercase tracking-[0.4em] text-white/55">
                      {regionVoteSummary.votesPlaced}/{players.length} oy verildi
                    </div>
                    <ul className="mt-4 space-y-2 text-sm text-white/80">
                      {players.map((player) => {
                        const vote = playerRegionVotes[player.id];
                        const isActive = activeRegionVoterId === player.id;
                        return (
                          <li
                            key={player.id}
                            className={`flex items-center justify-between rounded-2xl border px-3 py-2 ${
                              isActive ? 'border-white/60 bg-white/10' : 'border-white/15 bg-white/5'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: player.color }} />
                              {player.name}
                            </span>
                            <span className="text-[11px] uppercase tracking-[0.3em] text-white/60">
                              {vote ? getRegionDisplayName(vote) ?? 'Seçildi' : 'Bekleniyor'}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    {regionVoteTieCandidates.length > 1 && (
                      <div className="mt-4 rounded-2xl border border-white/20 bg-black/20 p-3 text-center text-xs">
                        <p>Oylar eşit! Çark karar veriyor.</p>
                        <div className="relative mx-auto mt-3 h-20 w-20">
                          <div
                            className={`absolute inset-0 rounded-full border-4 border-white/25 bg-[conic-gradient(#0ea5e9_0deg_180deg,#f97316_180deg_360deg)] ${
                              isRegionTieSpinning ? 'animate-spin' : ''
                            }`}
                          />
                          <div className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold uppercase tracking-[0.4em] text-white/80">
                            Çark
                          </div>
                          <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-white" />
                        </div>
                        {regionTieWinner && (
                          <p className="mt-2 text-xs text-white/80">
                            {getRegionDisplayName(regionTieWinner) ?? 'Bölge'} seçildi.
                          </p>
                        )}
                      </div>
                    )}
                    <p className="mt-4 text-center text-[10px] uppercase tracking-[0.4em] text-white/50">
                      Oylar tamamlanana kadar oyun bekliyor.
                    </p>
                  </div>
                </div>
              </>
            )}

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
                    <p className="text-xl font-semibold">{activePlayer?.name ?? ''}</p>
                    <p className="text-sm text-white/80">
                      Seçilen Bölge:{' '}
                      <span className="font-semibold text-white">
                        {pendingTargetCityName ?? selectedVoteCityName ?? ''}
                      </span>
                    </p>
                    <button
                      type="button"
                      className="pointer-events-auto inline-flex w-full items-center justify-center rounded-2xl border border-white/30 px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/15"
                      onClick={() => {
                        startQuestion(pendingContestCity);
                        setShowRegionResultModal(false);
                      }}
                    >
                      Soruyu Başlat
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
                  <p className="text-center text-sm text-white/70">
                    {selectedVoteCityName
                      ? `${selectedVoteCityName} oylaması tamamlandı. Haritadan bir bölge seçildiğinde soru burada görünecek.`
                      : 'Haritadan bir bölge seçildiğinde soru burada görünecek.'}
                  </p>
                )}
              </div>
            </div>

            {!isRegionVoteActive && (
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
            )}

            {feedback && !currentQuestion && !shouldShowRegionVoteOverlay && (
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
            {showRegionResultModal && !currentQuestion && (pendingTargetCityName || selectedVoteCityName) && (
              <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-[#010a1b]/80" />
                <div className="relative flex max-w-3xl flex-col items-center gap-5 rounded-[42px] border-4 border-white/30 bg-gradient-to-b from-sky-500/50 via-sky-800/50 to-slate-900/80 px-16 py-14 text-center text-white shadow-[0_40px_100px_rgba(0,0,0,0.85)]">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-4xl text-white shadow-[0_0_30px_rgba(0,0,0,0.45)]">
                    ★
                  </span>
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.6em] text-white/60">Seçilen Bölge</p>
                    <p className="text-4xl font-black tracking-tight">
                      {pendingTargetCityName ?? selectedVoteCityName ?? ''}
                    </p>
                    <p className="text-xs font-medium uppercase tracking-[0.35em] text-white/70">
                      Soruyu başlatmak için hazırlan
                    </p>
                  </div>
                </div>
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
                  <h2 className="mt-2 text-2xl font-semibold text-white">Ders seçimi</h2>
                  <p className="text-sm text-white/70">Soruların geleceği dersleri işaretleyin. En az bir ders seçin.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {SUBJECT_OPTIONS.map((subject) => {
                    const isSelected = selectedSubjects.includes(subject.id);
                    return (
                      <button
                        key={subject.id}
                        type="button"
                        onClick={() => handleSubjectToggle(subject.id)}
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                          isSelected
                            ? 'border-white/80 bg-white/20 text-white shadow-lg shadow-white/20'
                            : 'border-white/25 bg-white/5 text-white/70 hover:border-white/40 hover:bg-white/10'
                        }`}
                      >
                        <span className="font-semibold">{subject.label}</span>
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] uppercase tracking-[0.3em] ${
                            isSelected ? 'bg-white text-[#041633]' : 'border border-white/40 text-white/50'
                          }`}
                        >
                          {isSelected ? '✓' : '+'}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {isQuestionBankLoading ? (
                  <p className="text-xs text-white/70">Supabase soru bankasi yukleniyor...</p>
                ) : remoteQuestionBank?.length ? (
                  <p className="text-xs text-emerald-300">
                    Supabase kaynakli {remoteQuestionBank.length} soru kullanima hazir.
                  </p>
                ) : questionLoadError ? (
                  <p className="text-xs text-amber-300">{questionLoadError}</p>
                ) : null}
                <div className="rounded-2xl border border-white/20 bg-[#03142d]/60 p-4 text-sm text-white/80">
                  <p>Seçtiğiniz dersler oyunun ilk round’larında ağırlıklı olarak sorulacak.</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-6 rounded-3xl border border-white/20 bg-white/5 p-5 text-white">
              <div className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                <span>Round seçimi</span>
                <div className="flex flex-wrap gap-2">
                  {GAME_LENGTH_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      disabled={isSetupComplete}
                      onClick={() => setSelectedGameLength(option.id)}
                      className={`rounded-2xl px-5 py-2 text-sm font-semibold tracking-[0.2em] transition ${
                        option.id === selectedGameLength
                          ? 'bg-white text-[#041633]'
                          : 'border border-white/40 text-white/70 hover:border-white/70 hover:text-white'
                      } ${isSetupComplete ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <span>{option.label}</span>
                      <span className="ml-2 text-xs opacity-70">({option.rounds})</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-1 text-center text-sm text-white/80">
                <span>Oyuncu sayısı: {REQUIRED_PLAYER_COUNT}</span>
                <span>
                  Seçilen dersler: {selectedSubjectLabels.length ? selectedSubjectLabels.join(', ') : 'Henüz seçilmedi'}
                </span>
                <span className="text-xs text-white/60">
                  Round sayısı:{' '}
                  {GAME_LENGTH_OPTIONS.find((option) => option.id === selectedGameLength)?.rounds ??
                    setupGameLengthMeta?.rounds ??
                    '--'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleBeginGame}
                disabled={!canStartGame}
                className="rounded-2xl bg-white/90 px-6 py-3 text-sm font-semibold text-[#052049] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Oyuna Başla
              </button>
            </div>
          </section>
        )}
      </div>
      </main>
      {isSignupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="absolute inset-0" onClick={closeSignupForm} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-3xl space-y-6 rounded-[32px] border border-white/20 bg-gradient-to-b from-slate-900/90 to-slate-800/80 p-8 text-white shadow-[0_40px_120px_rgba(0,0,0,0.85)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">Adım 3</p>
                <h2 className="mt-2 text-3xl font-semibold">Kaydol</h2>
                <p className="text-sm text-white/70">
                  Gmail adresinizi paylaşarak Anadolu Hakimiyeti güncellemelerinden haberdar olun.
                </p>
              </div>
              <button
                type="button"
                onClick={closeSignupForm}
                className="rounded-full border border-white/40 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-white transition hover:bg-white/20"
              >
                Kapat
              </button>
            </div>
            <form className="space-y-5" onSubmit={handleSignupSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                  Ad
                  <input
                    value={signupForm.firstName}
                    onChange={(event) => handleSignupInputChange('firstName', event.target.value)}
                    placeholder="Adınız"
                    className="mt-2 w-full rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/40 outline-none transition focus:border-white/80"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                  Soyad
                  <input
                    value={signupForm.lastName}
                    onChange={(event) => handleSignupInputChange('lastName', event.target.value)}
                    placeholder="Soyadınız"
                    className="mt-2 w-full rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/40 outline-none transition focus:border-white/80"
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                Gmail adresi
                <input
                  type="email"
                  value={signupForm.email}
                  onChange={(event) => handleSignupInputChange('email', event.target.value)}
                  placeholder="ornek@gmail.com"
                  className="mt-2 w-full rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/40 outline-none transition focus:border-white/80"
                />
                <span className="mt-1 block text-[10px] uppercase tracking-[0.35em] text-white/50">Gmail zorunludur</span>
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                  Şifre
                  <input
                    type="password"
                    value={signupForm.password}
                    onChange={(event) => handleSignupInputChange('password', event.target.value)}
                    placeholder="En az 8 karakter"
                    className="mt-2 w-full rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/40 outline-none transition focus:border-white/80"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                  Okul / Kurum (opsiyonel)
                  <input
                    value={signupForm.organization}
                    onChange={(event) => handleSignupInputChange('organization', event.target.value)}
                    placeholder="Okulunuz veya kulübünüz..."
                    className="mt-2 w-full rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/40 outline-none transition focus:border-white/80"
                  />
                </label>
              </div>
              {signupStatus && (
                <p
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    signupStatus.type === 'success'
                      ? 'border-emerald-400/60 bg-emerald-600/15 text-emerald-50'
                      : 'border-rose-400/60 bg-rose-600/10 text-rose-100'
                  }`}
                >
                  {signupStatus.message}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeSignupForm}
                  className="rounded-2xl border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white transition hover:bg-white/10"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={!isSignupReady || isSignupSubmitting}
                  className="rounded-2xl bg-white/90 px-6 py-3 text-sm font-semibold text-[#052049] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSignupSubmitting ? 'Kaydınız gönderiliyor...' : 'Kaydol'}
                </button>
              </div>
              <p className="text-center text-[11px] uppercase tracking-[0.35em] text-white/50">Bilgileriniz gizli tutulur.</p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
