import { create } from 'zustand';
import type { CityState } from '@/types/realtime';
import { CITY_PRESETS, QUESTION_PRESETS, TEAM_PRESETS } from './fixtures';

export type GameLengthId = 'short' | 'normal' | 'long';

export const MAX_PLAYERS = 4;

export interface LocalPlayer {
  id: string;
  name: string;
  color: string;
  score: number;
  lastAnswerDuration?: number;
}

type GameStore = {
  players: LocalPlayer[];
  initialPlayers: LocalPlayer[];
  eliminatedPlayers: LocalPlayer[];
  activePlayerIndex: number;
  baseCities: CityState[];
  cities: CityState[];
  questions: LocalQuestion[];
  lastSelectedCityCode?: string;
  addPlayer: (name: string, color: string) => void;
  updatePlayer: (id: string, updates: Partial<Omit<LocalPlayer, 'id'>>) => void;
  removePlayer: (id: string) => void;
  startQuestion: (cityCode: string) => void;
  answerQuestion: (choiceIndex: number, durationMs?: number) => boolean;
  currentQuestion?: LocalQuestion;
  askedQuestionIds: string[];
  pendingCityCode?: string;
  lastAnswerCorrect?: boolean;
  setActivePlayer: (index: number) => void;
  advancePlayer: () => void;
  loadMapCities: (cities: CityState[]) => void;
  gameLength: GameLengthId;
  setGameLength: (gameLength: GameLengthId) => void;
  gameRoundTarget: number;
  roundsPlayed: number;
  roundTurns: number;
  roundPlayerCount: number;
  lastEliminatedPlayerName?: string;
  lastEliminatedCityCode?: string;
  contestCityCode?: string;
  pendingContestCityCode?: string;
  setPendingContestCity: (cityCode?: string) => void;
  initializeGame: (players: LocalPlayer[], gameLength: GameLengthId, roundsTarget: number) => void;
  reset: () => void;
};

const DEFAULT_PLAYERS: LocalPlayer[] = TEAM_PRESETS.slice(0, 2).map((team, index) => ({
  id: `P${index + 1}`,
  name: team.name,
  color: team.color,
  score: 0,
}));

const DEFAULT_CITIES: CityState[] = CITY_PRESETS.map((city) => ({
  id: city.code,
  code: city.code,
  name: city.name,
  region: city.region,
  ownerTeamId: null,
  ownerColor: null,
}));

type LocalQuestion = (typeof QUESTION_PRESETS)[number] & { id: string };

const QUESTION_POOL: LocalQuestion[] = QUESTION_PRESETS.map((question, index) => ({
  ...question,
  id: `Q${index + 1}`,
}));

const ROUND_PLAYER_SCHEDULE: Record<GameLengthId, number[]> = {
  short: [4, 3, 2],
  normal: [4, 4, 3, 3, 2],
  long: [4, 4, 4, 3, 3, 3, 2],
};

function clampIndex(index: number, length: number) {
  if (length === 0) return 0;
  if (index < 0) return 0;
  if (index >= length) return 0;
  return index;
}

export const useGameStore = create<GameStore>((set) => ({
  players: DEFAULT_PLAYERS,
  initialPlayers: DEFAULT_PLAYERS,
  eliminatedPlayers: [],
  activePlayerIndex: 0,
  baseCities: cloneDefaultCities(),
  cities: cloneDefaultCities(),
  lastSelectedCityCode: undefined,
  currentQuestion: undefined,
  askedQuestionIds: [],
  pendingCityCode: undefined,
  lastAnswerCorrect: undefined,
  gameLength: 'normal',
  gameRoundTarget: ROUND_PLAYER_SCHEDULE.normal.length,
  roundsPlayed: 0,
  roundTurns: 0,
  roundPlayerCount: ROUND_PLAYER_SCHEDULE.normal[0],
  lastEliminatedPlayerName: undefined,
  lastEliminatedCityCode: undefined,
  contestCityCode: undefined,
  pendingContestCityCode: undefined,

  setPendingContestCity: (cityCode) =>
    set((state) => {
      if (state.contestCityCode && cityCode && cityCode !== state.contestCityCode) {
        return state;
      }
      return { pendingContestCityCode: cityCode };
    }),

  addPlayer: (name, color) =>
    set((state) => {
      if (state.players.length >= MAX_PLAYERS) {
        return state;
      }
      const nextPlayers = [
        ...state.players,
        {
          id: `P${Date.now()}`,
          name: name || `Oyuncu ${state.players.length + 1}`,
          color,
          score: 0,
          lastAnswerDuration: undefined,
        },
      ];
      return {
        players: nextPlayers,
        initialPlayers: nextPlayers,
        roundPlayerCount: state.players.length + 1,
      };
    }),

  updatePlayer: (id, updates) =>
    set((state) => ({
      players: state.players.map((player) => (player.id === id ? { ...player, ...updates } : player)),
      initialPlayers: state.initialPlayers.map((player) => (player.id === id ? { ...player, ...updates } : player)),
    })),

  removePlayer: (id) =>
    set((state) => {
      const players = state.players.filter((player) => player.id !== id);
      const initialPlayers = state.initialPlayers.filter((player) => player.id !== id);
      const activePlayerIndex = clampIndex(state.activePlayerIndex, players.length);
      return {
        players,
        initialPlayers,
        activePlayerIndex,
        roundPlayerCount: players.length,
        roundTurns: Math.min(state.roundTurns, players.length),
      };
    }),

  startQuestion: (cityCode) =>
    set((state) => {
      if (state.currentQuestion) return state;
      const targetCode = state.contestCityCode ?? state.pendingContestCityCode ?? cityCode;
      const askedSet = new Set(state.askedQuestionIds);
      const available = state.questions.filter((question) => !askedSet.has(question.id));
      const pool = available.length ? available : state.questions;
      const question = pool[Math.floor(Math.random() * pool.length)];
      return {
        currentQuestion: question,
        pendingCityCode: targetCode,
        contestCityCode: targetCode,
        pendingContestCityCode: undefined,
        lastAnswerCorrect: undefined,
      };
    }),

  questions: QUESTION_POOL,
  answerQuestion: (choiceIndex, durationMs) => {
    let wasCorrect = false;
    set((state) => {
      const question = state.currentQuestion;
      if (!question) return state;
      const player = state.players[state.activePlayerIndex];
      let cities = state.cities;
      let players = state.players;
      wasCorrect = question.correctIndex === choiceIndex;
      if (player) {
        players = state.players.map((candidate) =>
          candidate.id === player.id
            ? { ...candidate, lastAnswerDuration: durationMs ?? candidate.lastAnswerDuration }
            : candidate,
        );
      }
      if (wasCorrect && player) {
        players = players.map((candidate) =>
          candidate.id === player.id ? { ...candidate, score: candidate.score + 10 } : candidate,
        );
      }
      const askedQuestionIds = state.askedQuestionIds.includes(question.id)
        ? state.askedQuestionIds
        : [...state.askedQuestionIds, question.id];
      const schedule = ROUND_PLAYER_SCHEDULE[state.gameLength] ?? [];
      const currentRoundTarget = schedule[state.roundsPlayed] ?? players.length;
      const nextActiveIndex = players.length ? (state.activePlayerIndex + 1) % players.length : 0;
      let roundTurns = state.roundTurns + 1;
      let roundsPlayed = state.roundsPlayed;
      let roundPlayerCount = currentRoundTarget;
      let lastEliminatedPlayerName = state.lastEliminatedPlayerName;
      let lastEliminatedCityCode = state.lastEliminatedCityCode;
      let activeIndex = nextActiveIndex;
      let contestCityCode = state.contestCityCode;
      let pendingCityCode = state.pendingCityCode;
      let pendingContestCityCode = state.pendingContestCityCode;
      let eliminatedPlayers = state.eliminatedPlayers;

      if (currentRoundTarget > 0 && roundTurns >= currentRoundTarget) {
        roundsPlayed += 1;
        roundTurns = 0;
        const nextRoundTarget = schedule[roundsPlayed];
        if (typeof nextRoundTarget === 'number') {
          const eliminationsNeeded = Math.max(0, players.length - nextRoundTarget);
          if (eliminationsNeeded > 0) {
            const cityCounts = countCitiesByOwner(cities);
            for (let i = 0; i < eliminationsNeeded; i += 1) {
              const eliminatedPlayer = pickEliminationCandidate(players, cityCounts);
              if (!eliminatedPlayer) break;
              players = players.filter((candidate) => candidate.id !== eliminatedPlayer.id);
              eliminatedPlayers = [...eliminatedPlayers, eliminatedPlayer];
              lastEliminatedPlayerName = eliminatedPlayer.name;
              lastEliminatedCityCode = state.pendingCityCode;
              if (players.length) {
                activeIndex = activeIndex % players.length;
              } else {
                activeIndex = 0;
              }
            }
          }
          roundPlayerCount = nextRoundTarget;
        } else {
          roundPlayerCount = players.length;
        }
      }

      if (roundsPlayed >= state.gameRoundTarget) {
        if (contestCityCode && wasCorrect) {
          const awardingPlayer = players.find((candidate) => candidate.id === player?.id) ?? player;
          if (awardingPlayer) {
            cities = cities.map((city) =>
              city.code === contestCityCode
                ? {
                    ...city,
                    ownerTeamId: awardingPlayer.id,
                    ownerColor: awardingPlayer.color,
                  }
                : city,
            );
          }
        }
        const combinedPlayers = [...players, ...eliminatedPlayers];
        const orderedSource = state.initialPlayers.length ? state.initialPlayers : combinedPlayers;
        players = orderedSource.map((initial) => combinedPlayers.find((player) => player.id === initial.id) ?? initial);
        eliminatedPlayers = [];
        contestCityCode = undefined;
        roundTurns = 0;
        roundsPlayed = 0;
        roundPlayerCount = schedule[0] ?? players.length;
        pendingCityCode = undefined;
        pendingContestCityCode = undefined;
        activeIndex = 0;
      } else {
        pendingContestCityCode = contestCityCode ?? pendingContestCityCode;
      }

      return {
        players,
        cities,
        askedQuestionIds,
        currentQuestion: undefined,
        pendingCityCode,
        lastSelectedCityCode: wasCorrect ? state.pendingCityCode : state.lastSelectedCityCode,
        lastAnswerCorrect: wasCorrect,
        activePlayerIndex: activeIndex,
        roundTurns,
        roundsPlayed,
        roundPlayerCount,
        lastEliminatedPlayerName,
        lastEliminatedCityCode,
        contestCityCode,
        pendingContestCityCode,
        eliminatedPlayers,
      };
    });
    return wasCorrect;
  },

  setActivePlayer: (index) =>
    set((state) => ({
      activePlayerIndex: clampIndex(index, state.players.length),
    })),

  advancePlayer: () =>
    set((state) => ({
      activePlayerIndex: state.players.length ? (state.activePlayerIndex + 1) % state.players.length : 0,
    })),

  setGameLength: (gameLength) => set(() => ({ gameLength })),

  initializeGame: (players, gameLength, roundsTarget) =>
    set(() => {
      const preparedPlayers = players.slice(0, MAX_PLAYERS);
      const schedule = ROUND_PLAYER_SCHEDULE[gameLength] ?? [];
      return {
        players: preparedPlayers,
        initialPlayers: preparedPlayers,
        eliminatedPlayers: [],
        activePlayerIndex: 0,
        cities: cloneDefaultCities(),
        lastSelectedCityCode: undefined,
        currentQuestion: undefined,
        askedQuestionIds: [],
        pendingCityCode: undefined,
        lastAnswerCorrect: undefined,
        gameLength,
        gameRoundTarget: schedule.length || roundsTarget,
        roundsPlayed: 0,
        roundTurns: 0,
        roundPlayerCount: schedule[0] ?? preparedPlayers.length,
        lastEliminatedPlayerName: undefined,
        lastEliminatedCityCode: undefined,
        contestCityCode: undefined,
        pendingContestCityCode: undefined,
      };
    }),

  loadMapCities: (cities) =>
    set((state) => {
      const schedule = ROUND_PLAYER_SCHEDULE[state.gameLength] ?? ROUND_PLAYER_SCHEDULE.normal;
      const normalized = cities.map((city, index) => ({
        id: city.id ?? city.code ?? `CITY-${index}`,
        code: city.code ?? city.id ?? `CITY-${index}`,
        name: city.name ?? `Bölge ${index + 1}`,
        region: city.region ?? city.name ?? `Bölge ${index + 1}`,
        ownerTeamId: null,
        ownerColor: null,
      }));
      const resetPlayers = state.players.map((player) => ({ ...player, score: 0 }));
      return {
        baseCities: normalized,
        cities: normalized,
        lastSelectedCityCode: undefined,
        currentQuestion: undefined,
        askedQuestionIds: [],
        pendingCityCode: undefined,
        lastAnswerCorrect: undefined,
        contestCityCode: undefined,
        pendingContestCityCode: undefined,
        roundsPlayed: 0,
        roundTurns: 0,
        roundPlayerCount: normalized.length ? Math.min(normalized.length, schedule[0] ?? normalized.length) : 0,
        players: resetPlayers,
        initialPlayers: resetPlayers,
        eliminatedPlayers: [],
        activePlayerIndex: 0,
      };
    }),

  reset: () =>
    set((state) => ({
      players: DEFAULT_PLAYERS,
      initialPlayers: DEFAULT_PLAYERS,
      eliminatedPlayers: [],
      activePlayerIndex: 0,
      cities: state.baseCities.map((city) => ({ ...city, ownerTeamId: null, ownerColor: null })),
      lastSelectedCityCode: undefined,
      currentQuestion: undefined,
      askedQuestionIds: [],
      pendingCityCode: undefined,
      lastAnswerCorrect: undefined,
      gameLength: 'normal',
      gameRoundTarget: ROUND_PLAYER_SCHEDULE.normal.length,
      roundsPlayed: 0,
      roundTurns: 0,
      roundPlayerCount: ROUND_PLAYER_SCHEDULE.normal[0],
      lastEliminatedPlayerName: undefined,
      lastEliminatedCityCode: undefined,
      contestCityCode: undefined,
      pendingContestCityCode: undefined,
    })),
}));

function countCitiesByOwner(cities: CityState[]) {
  const counts = new Map<string, number>();
  cities.forEach((city) => {
    if (city.ownerTeamId) {
      counts.set(city.ownerTeamId, (counts.get(city.ownerTeamId) ?? 0) + 1);
    }
  });
  return counts;
}

function pickEliminationCandidate(players: LocalPlayer[], cityCounts: Map<string, number>) {
  let candidate: LocalPlayer | undefined;
  players.forEach((player) => {
    if (!candidate) {
      candidate = player;
      return;
    }
    if (player.score < candidate.score) {
      candidate = player;
      return;
    }
    if (player.score === candidate.score) {
      const candidateDuration = candidate.lastAnswerDuration ?? Number.POSITIVE_INFINITY;
      const playerDuration = player.lastAnswerDuration ?? Number.POSITIVE_INFINITY;
      if (playerDuration < candidateDuration) {
        candidate = player;
        return;
      }
      if (playerDuration === candidateDuration) {
        const playerCities = cityCounts.get(player.id) ?? 0;
        const candidateCities = cityCounts.get(candidate.id) ?? 0;
        if (playerCities < candidateCities) {
          candidate = player;
        }
      }
    }
  });
  return candidate;
}

function cloneDefaultCities() {
  return DEFAULT_CITIES.map((city) => ({ ...city }));
}
