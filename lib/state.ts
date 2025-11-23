import { create } from 'zustand';
import type { CityState } from '@/types/realtime';
import { CITY_PRESETS, QUESTION_PRESETS, TEAM_PRESETS } from './fixtures';

export const MAX_PLAYERS = 4;

export interface LocalPlayer {
  id: string;
  name: string;
  color: string;
  score: number;
}

type GameStore = {
  players: LocalPlayer[];
  activePlayerIndex: number;
  cities: CityState[];
  questions: LocalQuestion[];
  lastSelectedCityCode?: string;
  addPlayer: (name: string, color: string) => void;
  updatePlayer: (id: string, updates: Partial<Omit<LocalPlayer, 'id'>>) => void;
  removePlayer: (id: string) => void;
  startQuestion: (cityCode: string) => void;
  answerQuestion: (choiceIndex: number) => boolean;
  currentQuestion?: LocalQuestion;
  askedQuestionIds: string[];
  pendingCityCode?: string;
  lastAnswerCorrect?: boolean;
  setActivePlayer: (index: number) => void;
  advancePlayer: () => void;
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

function clampIndex(index: number, length: number) {
  if (length === 0) return 0;
  if (index < 0) return 0;
  if (index >= length) return 0;
  return index;
}

export const useGameStore = create<GameStore>((set, get) => ({
  players: DEFAULT_PLAYERS,
  activePlayerIndex: 0,
  cities: DEFAULT_CITIES,
  lastSelectedCityCode: undefined,
  currentQuestion: undefined,
  askedQuestionIds: [],
  pendingCityCode: undefined,
  lastAnswerCorrect: undefined,

  addPlayer: (name, color) =>
    set((state) => {
      if (state.players.length >= MAX_PLAYERS) {
        return state;
      }
      return {
        players: [
          ...state.players,
          {
            id: `P${Date.now()}`,
            name: name || `Oyuncu ${state.players.length + 1}`,
            color,
            score: 0,
          },
        ],
      };
    }),

  updatePlayer: (id, updates) =>
    set((state) => ({
      players: state.players.map((player) => (player.id === id ? { ...player, ...updates } : player)),
    })),

  removePlayer: (id) =>
    set((state) => {
      const players = state.players.filter((player) => player.id !== id);
      const activePlayerIndex = clampIndex(state.activePlayerIndex, players.length);
      return { players, activePlayerIndex };
    }),

  startQuestion: (cityCode) =>
    set((state) => {
      if (state.currentQuestion) return state;
      const askedSet = new Set(state.askedQuestionIds);
      const available = state.questions.filter((question) => !askedSet.has(question.id));
      const pool = available.length ? available : state.questions;
      const question = pool[Math.floor(Math.random() * pool.length)];
      return {
        currentQuestion: question,
        pendingCityCode: cityCode,
        lastAnswerCorrect: undefined,
      };
    }),

  questions: QUESTION_POOL,
  answerQuestion: (choiceIndex) => {
    let wasCorrect = false;
    const players = get().players;
    set((state) => {
      const question = state.currentQuestion;
      if (!question) return state;
      const player = players[state.activePlayerIndex];
      let cities = state.cities;
      wasCorrect = question.correctIndex === choiceIndex;
      if (wasCorrect && state.pendingCityCode && player) {
        cities = state.cities.map((city) =>
          city.code === state.pendingCityCode
            ? {
                ...city,
                ownerTeamId: player.id,
                ownerColor: player.color,
              }
            : city,
        );
      }
      const askedQuestionIds = state.askedQuestionIds.includes(question.id)
        ? state.askedQuestionIds
        : [...state.askedQuestionIds, question.id];
      const nextActiveIndex = players.length ? (state.activePlayerIndex + 1) % players.length : 0;
      return {
        cities,
        askedQuestionIds,
        currentQuestion: undefined,
        pendingCityCode: undefined,
        lastSelectedCityCode: wasCorrect ? state.pendingCityCode : state.lastSelectedCityCode,
        lastAnswerCorrect: wasCorrect,
        activePlayerIndex: nextActiveIndex,
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

  reset: () =>
    set({
      players: DEFAULT_PLAYERS,
      activePlayerIndex: 0,
      cities: DEFAULT_CITIES,
      lastSelectedCityCode: undefined,
      currentQuestion: undefined,
      askedQuestionIds: [],
      pendingCityCode: undefined,
      lastAnswerCorrect: undefined,
    }),
}));
