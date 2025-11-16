import type { NextApiRequest } from 'next';
import type { NextApiResponse } from 'next';
import type { Server as HTTPServer } from 'http';
import { Server as IOServer, type Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import type {
  ClientToServerEvents,
  GameLogEntry,
  QuestionPayload,
  RoomState,
  ServerToClientEvents,
} from '@/types/realtime';
import { dataService } from '@/lib/data-service';

type NextApiResponseWithSocket = NextApiResponse & {
  socket: NextApiResponse['socket'] & {
    server: HTTPServer & {
      io?: IOServer<ClientToServerEvents, ServerToClientEvents>;
    };
  };
};

interface ActiveQuestionState {
  cityId: string;
  cityCode: string;
  color?: string;
  questionId: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  expiresAt: number;
  timeout: NodeJS.Timeout;
  answeredTeams: Set<string>;
  winnerTeamId?: string;
}

interface SocketData {
  roomCode?: string;
  roomId?: string;
  teamId?: string;
  nickname?: string;
}

const activeQuestions = new Map<string, ActiveQuestionState>();
const roomLogs = new Map<string, GameLogEntry[]>();
const roomMembers = new Map<string, Map<string, Set<string>>>();
const askedQuestions = new Map<string, Set<string>>();

function ensureMemberMap(roomCode: string) {
  if (!roomMembers.has(roomCode)) {
    roomMembers.set(roomCode, new Map());
  }
  return roomMembers.get(roomCode)!;
}

function appendLog(roomCode: string, message: string) {
  const entry: GameLogEntry = {
    id: randomUUID(),
    message,
    timestamp: Date.now(),
  };
  const list = roomLogs.get(roomCode) ?? [];
  roomLogs.set(roomCode, [entry, ...list].slice(0, 20));
  return entry;
}

async function buildRoomState(roomCode: string): Promise<RoomState | null> {
  const roomWithState = await dataService.getRoomWithState(roomCode);
  if (!roomWithState) {
    return null;
  }

  const memberMap = ensureMemberMap(roomCode);

  const teams = roomWithState.teams.map((team) => ({
    id: team.id,
    name: team.name,
    color: team.color,
    score: team.score,
    members: memberMap.get(team.id)?.size ?? 0,
  }));

  const cities = roomWithState.cities.map((city) => ({
    id: city.id,
    code: city.code,
    name: city.name,
    region: city.region ?? null,
    ownerTeamId: city.ownerTeamId ?? null,
    ownerColor: city.owner?.color ?? null,
  }));

  const runtimeQuestion = activeQuestions.get(roomCode);

  return {
    code: roomWithState.room.code,
    teams,
    cities,
    log: roomLogs.get(roomCode) ?? [],
    activeQuestion: runtimeQuestion
      ? {
          id: runtimeQuestion.questionId,
          prompt: runtimeQuestion.prompt,
          choices: runtimeQuestion.choices,
          cityCode: runtimeQuestion.cityCode,
          expiresAt: runtimeQuestion.expiresAt,
        }
      : undefined,
  };
}

async function broadcastRoomState(
  io: IOServer<ClientToServerEvents, ServerToClientEvents>,
  roomCode: string,
) {
  const state = await buildRoomState(roomCode);
  if (state) {
    io.to(roomCode).emit('room_state', state);
  }
}

function clearRuntimeQuestion(roomCode: string) {
  const active = activeQuestions.get(roomCode);
  if (active) {
    clearTimeout(active.timeout);
    activeQuestions.delete(roomCode);
  }
}

async function handleQuestionTimeout(
  io: IOServer<ClientToServerEvents, ServerToClientEvents>,
  roomCode: string,
) {
  const active = activeQuestions.get(roomCode);
  if (!active) return;
  appendLog(roomCode, `Süre doldu: ${active.cityCode} için doğru cevap gelmedi.`);
  clearRuntimeQuestion(roomCode);
  io.to(roomCode).emit('question_timeout', { cityCode: active.cityCode });
  await broadcastRoomState(io, roomCode);
}

function registerSocketHandlers(
  io: IOServer<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
) {
  const data = socket.data as SocketData;

  socket.on('join_room', async ({ roomCode, nickname }) => {
    try {
      const safeNickname = nickname?.trim().slice(0, 32) || 'Misafir';
      const roomData = await dataService.getRoomWithState(roomCode);

      if (!roomData) {
        socket.emit('join_error', { message: 'Oda bulunamadı.' });
        return;
      }

      const members = ensureMemberMap(roomCode);
      roomData.teams.forEach((team) => {
        if (!members.has(team.id)) {
          members.set(team.id, new Set());
        }
      });

      const sortedTeams = [...roomData.teams].sort((a, b) => {
        const mA = members.get(a.id)?.size ?? 0;
        const mB = members.get(b.id)?.size ?? 0;
        if (mA === mB) {
          return a.name.localeCompare(b.name, 'tr');
        }
        return mA - mB;
      });

      const assignedTeam = sortedTeams[0];
      if (!assignedTeam) {
        socket.emit('join_error', { message: 'Bu oda için takım bulunamadı.' });
        return;
      }

      members.get(assignedTeam.id)!.add(socket.id);

      data.roomCode = roomData.room.code;
      data.roomId = roomData.room.id;
      data.teamId = assignedTeam.id;
      data.nickname = safeNickname;

      socket.join(roomData.room.code);
      socket.emit('joined_room', {
        roomCode: roomData.room.code,
        teamId: assignedTeam.id,
        nickname: safeNickname,
      });
      appendLog(roomData.room.code, `${safeNickname} ${assignedTeam.name} takımına katıldı.`);
      await broadcastRoomState(io, roomData.room.code);
    } catch (error) {
      console.error('[join_room] error', error);
      socket.emit('join_error', { message: 'Odaya katılırken hata oluştu.' });
    }
  });

  socket.on('leave_room', async () => {
    const roomCode = data.roomCode;
    if (!roomCode) return;
    const members = ensureMemberMap(roomCode);
    if (data.teamId && members.has(data.teamId)) {
      members.get(data.teamId)!.delete(socket.id);
    }
    const nickname = data.nickname ?? 'Katılımcı';
    socket.leave(roomCode);
    appendLog(roomCode, `${nickname} oyundan ayrıldı.`);
    data.roomCode = undefined;
    data.roomId = undefined;
    data.teamId = undefined;
    await broadcastRoomState(io, roomCode);
  });

  socket.on('select_color', async ({ color }) => {
    try {
      if (!data.roomCode || !data.roomId || !data.teamId || !data.nickname) {
        socket.emit('answer_ack', { accepted: false, reason: 'not_joined' });
        return;
      }

      const roomCode = data.roomCode;
      const roomId = data.roomId;
      const current = activeQuestions.get(roomCode);
      if (current) {
        socket.emit('answer_ack', { accepted: false, reason: 'question_in_progress' });
        return;
      }

      // Harita config'ini yükle
      const fs = await import('fs');
      const path = await import('path');
      const indexPath = path.join(process.cwd(), 'lib', 'maps', 'index.json');
      const indexData = fs.readFileSync(indexPath, 'utf-8');
      const index = JSON.parse(indexData);
      
      const activeMap = index.maps.find((m: any) => m.id === index.activeMapId);
      if (!activeMap) {
        socket.emit('answer_ack', { accepted: false, reason: 'no_map_config' });
        return;
      }

      // Bu renge ait şehirleri bul
      const citiesForColor: string[] = [];
      Object.values(activeMap.config.regions).forEach((region: any) => {
        if (region.color === color) {
          citiesForColor.push(...region.cities);
        }
      });

      if (citiesForColor.length === 0) {
        socket.emit('answer_ack', { accepted: false, reason: 'no_cities_for_color' });
        return;
      }

      // Sahip olunmayan şehirleri filtrele
      const roomState = await dataService.getRoomWithState(roomCode);
      if (!roomState) {
        socket.emit('answer_ack', { accepted: false, reason: 'room_not_found' });
        return;
      }

      const availableCities = citiesForColor.filter(cityCode => {
        const cityState = roomState.cities.find(c => c.code === cityCode);
        return !cityState || !cityState.ownerTeamId;
      });

      if (availableCities.length === 0) {
        socket.emit('answer_ack', { accepted: false, reason: 'all_cities_occupied' });
        return;
      }

      const selectedCityCode = availableCities[Math.floor(Math.random() * availableCities.length)];
      const city = await dataService.getCityForSelection(roomId, selectedCityCode);
      if (!city) {
        socket.emit('answer_ack', { accepted: false, reason: 'city_not_found' });
        return;
      }

      const usedSet = askedQuestions.get(roomCode) ?? new Set<string>();
      askedQuestions.set(roomCode, usedSet);

      const question = await dataService.selectQuestionForCity({
        roomId,
        city,
        usedQuestionIds: usedSet,
      });

      if (!question) {
        socket.emit('answer_ack', { accepted: false, reason: 'no_question_available' });
        return;
      }

      const expiresAt = Date.now() + 15_000;
      const timeout = setTimeout(() => {
        void handleQuestionTimeout(io, roomCode);
      }, expiresAt - Date.now());

      activeQuestions.set(roomCode, {
        cityId: city.id,
        cityCode: selectedCityCode,
        questionId: question.id,
        prompt: question.prompt,
        choices: question.choices,
        correctIndex: question.correctIndex,
        expiresAt,
        timeout,
        answeredTeams: new Set(),
      });

      usedSet.add(question.id);
      appendLog(roomCode, `${city.name} için soru başladı.`);
      const questionPayload: QuestionPayload = {
        id: question.id,
        prompt: question.prompt,
        choices: question.choices,
        cityCode: selectedCityCode,
        expiresAt,
      };

      io.to(roomCode).emit('question_started', questionPayload);
      await broadcastRoomState(io, roomCode);
    } catch (error) {
      console.error('[select_color] error', error);
      socket.emit('answer_ack', { accepted: false, reason: 'server_error' });
    }
  });

  socket.on('select_city', async ({ cityCode }) => {
    try {
      if (!data.roomCode || !data.roomId || !data.teamId || !data.nickname) {
        socket.emit('answer_ack', { accepted: false, reason: 'not_joined' });
        return;
      }

      const roomCode = data.roomCode;
      const roomId = data.roomId;
      const current = activeQuestions.get(roomCode);
      if (current) {
        socket.emit('answer_ack', { accepted: false, reason: 'question_in_progress' });
        return;
      }

      const city = await dataService.getCityForSelection(roomId, cityCode);

      if (!city) {
        socket.emit('answer_ack', { accepted: false, reason: 'city_not_found' });
        return;
      }

      if (city.ownerTeamId) {
        socket.emit('answer_ack', { accepted: false, reason: 'occupied' });
        return;
      }

      const usedSet = askedQuestions.get(roomCode) ?? new Set<string>();
      askedQuestions.set(roomCode, usedSet);

      const question = await dataService.selectQuestionForCity({ roomId, city, usedQuestionIds: usedSet });

      if (!question) {
        socket.emit('answer_ack', { accepted: false, reason: 'no_question_available' });
        return;
      }

      const expiresAt = Date.now() + 15_000;
      const timeout = setTimeout(() => {
        void handleQuestionTimeout(io, roomCode);
      }, expiresAt - Date.now());

      activeQuestions.set(roomCode, {
        cityId: city.id,
        cityCode,
        questionId: question.id,
        prompt: question.prompt,
        choices: question.choices,
        correctIndex: question.correctIndex,
        expiresAt,
        timeout,
        answeredTeams: new Set(),
      });

      usedSet.add(question.id);
      appendLog(roomCode, `${city.name} için soru başladı.`);
      const questionPayload: QuestionPayload = {
        id: question.id,
        prompt: question.prompt,
        choices: question.choices,
        cityCode,
        expiresAt,
      };

      io.to(roomCode).emit('question_started', questionPayload);
      await broadcastRoomState(io, roomCode);
    } catch (error) {
      console.error('[select_city] error', error);
      socket.emit('answer_ack', { accepted: false, reason: 'server_error' });
    }
  });

  socket.on('submit_answer', async ({ choiceIndex }) => {
    try {
      if (!data.roomCode || !data.teamId || !data.nickname) {
        socket.emit('answer_ack', { accepted: false, reason: 'not_joined' });
        return;
      }

      const roomCode = data.roomCode;
      const teamId = data.teamId;
      const active = activeQuestions.get(roomCode);

      if (!active) {
        socket.emit('answer_ack', { accepted: false, reason: 'no_active_question' });
        return;
      }

      if (Date.now() > active.expiresAt) {
        socket.emit('answer_ack', { accepted: false, reason: 'too_late' });
        return;
      }

      if (active.answeredTeams.has(teamId)) {
        socket.emit('answer_ack', { accepted: false, reason: 'already_answered' });
        return;
      }

      active.answeredTeams.add(teamId);
      socket.emit('answer_ack', { accepted: true });

      const isCorrect = choiceIndex === active.correctIndex;

      await dataService.recordAnswerLog({
        teamId,
        questionId: active.questionId,
        cityId: active.cityId,
        isCorrect,
        isFirstCorrect: isCorrect && !active.winnerTeamId,
      });

      if (!isCorrect) {
        io.to(roomCode).emit('answer_result', {
          cityCode: active.cityCode,
          wasCorrect: false,
          nickname: data.nickname,
          message: 'Yanlış cevap.',
        });
        clearRuntimeQuestion(roomCode);
        await broadcastRoomState(io, roomCode);
        return;
      }

      if (active.winnerTeamId) {
        socket.emit('answer_result', {
          cityCode: active.cityCode,
          wasCorrect: true,
          nickname: data.nickname,
          message: 'Bir başka takım daha önce doğru bildi.',
        });
        return;
      }

      active.winnerTeamId = teamId;
      clearTimeout(active.timeout);

      const updatedCity = await dataService.assignCityOwner(active.cityId, teamId);
      const updatedTeam = await dataService.incrementTeamScore(teamId);

      appendLog(roomCode, `${data.nickname} ${updatedCity.name} şehrini kazandı!`);

      io.to(roomCode).emit('answer_result', {
        cityCode: active.cityCode,
        wasCorrect: true,
        teamId,
        nickname: data.nickname,
      });
      io.to(roomCode).emit('city_conquered', { cityCode: active.cityCode, teamId });
      io.to(roomCode).emit('score_update', { teamId, score: updatedTeam.score });

      clearRuntimeQuestion(roomCode);
      await broadcastRoomState(io, roomCode);
    } catch (error) {
      console.error('[submit_answer] error', error);
      socket.emit('answer_ack', { accepted: false, reason: 'server_error' });
    }
  });
}

function initSocketIO(res: NextApiResponseWithSocket) {
  if (!res.socket.server.io) {
    const io = new IOServer<ClientToServerEvents, ServerToClientEvents>(res.socket.server, {
      path: '/api/socket',
    });
    res.socket.server.io = io;
    io.on('connection', (socket) => registerSocketHandlers(io, socket));
  }
  return res.socket.server.io!;
}

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }
  initSocketIO(res);
  res.end();
}

export const config = {
  api: {
    bodyParser: false,
  },
};
