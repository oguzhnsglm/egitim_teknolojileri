export interface TeamSummary {
  id: string;
  name: string;
  color: string;
  score: number;
  members: number;
}

export interface CityState {
  id: string;
  code: string;
  name: string;
  region?: string | null;
  ownerTeamId?: string | null;
  ownerColor?: string | null;
}

export interface QuestionPayload {
  id: string;
  prompt: string;
  choices: string[];
  cityCode: string;
  region?: string;
  color?: string;
  expiresAt: number;
}

export interface GameLogEntry {
  id: string;
  message: string;
  timestamp: number;
}

export interface RoomState {
  code: string;
  teams: TeamSummary[];
  cities: CityState[];
  log: GameLogEntry[];
  activeQuestion?: QuestionPayload;
}

export interface ClientToServerEvents {
  join_room(payload: { roomCode: string; nickname: string }): void;
  leave_room(): void;
  select_city(payload: { cityCode: string }): void;
  select_region(payload: { regionName: string }): void;
  select_color(payload: { color: string }): void;
  submit_answer(payload: { choiceIndex: number }): void;
}

export interface ServerToClientEvents {
  joined_room(payload: { roomCode: string; teamId: string; nickname: string }): void;
  join_error(payload: { message: string }): void;
  room_state(payload: RoomState): void;
  question_started(payload: QuestionPayload): void;
  question_timeout(payload: { cityCode: string }): void;
  answer_result(payload: {
    cityCode: string;
    teamId?: string;
    wasCorrect: boolean;
    nickname?: string;
    message?: string;
  }): void;
  city_conquered(payload: { cityCode: string; teamId: string }): void;
  score_update(payload: { teamId: string; score: number }): void;
  answer_ack(payload: { accepted: boolean; reason?: string }): void;
}
