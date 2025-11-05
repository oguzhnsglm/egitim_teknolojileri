import { create } from 'zustand';
import type { QuestionPayload, RoomState } from '@/types/realtime';

type AnswerStatus = 'pending' | 'correct' | 'wrong' | 'late';

interface GameStore {
  nickname?: string;
  teamId?: string;
  roomCode?: string;
  roomState?: RoomState;
  activeQuestion?: QuestionPayload;
  answerStatus?: AnswerStatus;
  answeredChoice?: number;
  answerMessage?: string;
  setNickname: (nickname: string) => void;
  setAssignment: (payload: { roomCode: string; teamId: string }) => void;
  setRoomState: (state: RoomState) => void;
  setActiveQuestion: (question?: QuestionPayload) => void;
  setAnswerStatus: (status?: AnswerStatus, choiceIndex?: number, message?: string) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  setNickname: (nickname) => set({ nickname }),
  setAssignment: ({ roomCode, teamId }) => set({ roomCode, teamId }),
  setRoomState: (state) =>
    set({
      roomState: state,
      activeQuestion: state.activeQuestion,
    }),
  setActiveQuestion: (question) =>
    set((prev) => ({
      activeQuestion: question,
      roomState: prev.roomState
        ? {
            ...prev.roomState,
            activeQuestion: question,
          }
        : prev.roomState,
    })),
  setAnswerStatus: (status, choiceIndex, message) =>
    set({
      answerStatus: status,
      answeredChoice: choiceIndex,
      answerMessage: message,
    }),
  reset: () =>
    set({
      nickname: undefined,
      teamId: undefined,
      roomCode: undefined,
      roomState: undefined,
      activeQuestion: undefined,
      answerStatus: undefined,
      answeredChoice: undefined,
      answerMessage: undefined,
    }),
}));
