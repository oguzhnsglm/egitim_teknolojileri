import { randomUUID } from 'crypto';
import { TEAM_PRESETS, CITY_PRESETS, QUESTION_PRESETS } from './fixtures';
import { prisma, prismaAvailable } from './prisma';

type UUID = string;

type RoomRecord = {
  id: UUID;
  code: string;
  createdAt: Date;
  updatedAt: Date;
};

type TeamRecord = {
  id: UUID;
  name: string;
  color: string;
  roomId: UUID;
  score: number;
  createdAt: Date;
  updatedAt: Date;
};

type CityRecord = {
  id: UUID;
  code: string;
  name: string;
  region?: string | null;
  roomId: UUID;
  ownerTeamId?: UUID | null;
  createdAt: Date;
  updatedAt: Date;
};

type QuestionRecord = {
  id: UUID;
  prompt: string;
  choices: string[];
  correctIndex: number;
  region?: string | null;
  cityId?: UUID | null;
  roomId: UUID;
  createdAt: Date;
  updatedAt: Date;
};

export type RoomWithState = {
  room: RoomRecord;
  teams: TeamRecord[];
  cities: (CityRecord & { owner?: TeamRecord | null })[];
};

export interface DataService {
  createRoomWithPresets(code: string): Promise<RoomRecord>;
  roomExists(code: string): Promise<boolean>;
  getRoomMeta(code: string): Promise<RoomRecord | null>;
  getRoomWithState(code: string): Promise<RoomWithState | null>;
  getCityForSelection(roomId: UUID, cityCode: string): Promise<(CityRecord & { owner?: TeamRecord | null }) | null>;
  selectQuestionForCity(params: {
    roomId: UUID;
    city: CityRecord;
  }): Promise<QuestionRecord | null>;
  recordAnswerLog(params: {
    teamId: UUID;
    questionId: UUID;
    cityId: UUID;
    isCorrect: boolean;
    isFirstCorrect: boolean;
  }): Promise<void>;
  assignCityOwner(cityId: UUID, teamId: UUID): Promise<CityRecord>;
  incrementTeamScore(teamId: UUID): Promise<TeamRecord>;
}

class MemoryDataService implements DataService {
  private roomsById = new Map<UUID, RoomRecord>();

  private roomsByCode = new Map<string, RoomRecord>();

  private teams = new Map<UUID, TeamRecord>();

  private cities = new Map<UUID, CityRecord>();

  private questions = new Map<UUID, QuestionRecord>();

  private answerLogs: Array<{
    id: UUID;
    teamId: UUID;
    questionId: UUID;
    cityId: UUID;
    isCorrect: boolean;
    isFirstCorrect: boolean;
    createdAt: Date;
  }> = [];

  constructor() {
    void this.createRoomWithPresets('TEST01');
  }

  async createRoomWithPresets(code: string) {
    const existing = this.roomsByCode.get(code);
    if (existing) {
      return existing;
    }
    const now = new Date();
    const room: RoomRecord = {
      id: randomUUID(),
      code,
      createdAt: now,
      updatedAt: now,
    };
    this.roomsById.set(room.id, room);
    this.roomsByCode.set(code, room);

    TEAM_PRESETS.forEach((preset, index) => {
      const team: TeamRecord = {
        id: randomUUID(),
        name: preset.name,
        color: preset.color,
        roomId: room.id,
        score: 0,
        createdAt: new Date(now.getTime() + index),
        updatedAt: new Date(now.getTime() + index),
      };
      this.teams.set(team.id, team);
    });

    CITY_PRESETS.forEach((preset, index) => {
      const city: CityRecord = {
        id: randomUUID(),
        code: preset.code,
        name: preset.name,
        region: preset.region,
        roomId: room.id,
        ownerTeamId: null,
        createdAt: new Date(now.getTime() + index),
        updatedAt: new Date(now.getTime() + index),
      };
      this.cities.set(city.id, city);
    });

    QUESTION_PRESETS.forEach((preset, index) => {
      const city = preset.cityCode
        ? Array.from(this.cities.values()).find((candidate) => candidate.roomId === room.id && candidate.code === preset.cityCode)
        : undefined;
      const question: QuestionRecord = {
        id: randomUUID(),
        prompt: preset.prompt,
        choices: [...preset.choices],
        correctIndex: preset.correctIndex,
        region: preset.region ?? null,
        cityId: city?.id ?? null,
        roomId: room.id,
        createdAt: new Date(now.getTime() + index),
        updatedAt: new Date(now.getTime() + index),
      };
      this.questions.set(question.id, question);
    });

    return room;
  }

  async roomExists(code: string) {
    return this.roomsByCode.has(code);
  }

  async getRoomMeta(code: string) {
    return this.roomsByCode.get(code) ?? null;
  }

  async getRoomWithState(code: string) {
    const room = this.roomsByCode.get(code);
    if (!room) return null;

    const teams = Array.from(this.teams.values())
      .filter((team) => team.roomId === room.id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const cities = Array.from(this.cities.values())
      .filter((city) => city.roomId === room.id)
      .map((city) => ({
        ...city,
        owner: city.ownerTeamId ? this.teams.get(city.ownerTeamId) ?? null : null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));

    return { room, teams, cities };
  }

  async getCityForSelection(roomId: string, cityCode: string) {
    const city = Array.from(this.cities.values()).find(
      (candidate) => candidate.roomId === roomId && candidate.code === cityCode,
    );
    if (!city) return null;
    return { ...city, owner: city.ownerTeamId ? this.teams.get(city.ownerTeamId) ?? null : null };
  }

  async selectQuestionForCity({ roomId, city }: { roomId: string; city: CityRecord }) {
    const roomQuestions = Array.from(this.questions.values()).filter((question) => question.roomId === roomId);

    const exact = roomQuestions.find((question) => question.cityId === city.id);
    if (exact) return exact;

    const regional = roomQuestions.find(
      (question) => !question.cityId && question.region && question.region === city.region,
    );
    if (regional) return regional;

    const any = roomQuestions.find((question) => !question.cityId);
    return any ?? null;
  }

  async recordAnswerLog({ teamId, questionId, cityId, isCorrect, isFirstCorrect }: Parameters<DataService['recordAnswerLog']>[0]) {
    this.answerLogs.push({
      id: randomUUID(),
      teamId,
      questionId,
      cityId,
      isCorrect,
      isFirstCorrect,
      createdAt: new Date(),
    });
  }

  async assignCityOwner(cityId: string, teamId: string) {
    const city = this.cities.get(cityId);
    if (!city) {
      throw new Error('City not found');
    }
    city.ownerTeamId = teamId;
    city.updatedAt = new Date();
    this.cities.set(cityId, city);
    return city;
  }

  async incrementTeamScore(teamId: string) {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error('Team not found');
    }
    team.score += 1;
    team.updatedAt = new Date();
    this.teams.set(teamId, team);
    return team;
  }
}

class PrismaDataService implements DataService {
  constructor(private client: NonNullable<typeof prisma>) {}

  async createRoomWithPresets(code: string) {
    const room = await this.client.room.create({
      data: {
        code,
      },
    });

    await Promise.all(
      TEAM_PRESETS.map((team, index) =>
        this.client.team.create({
          data: {
            ...team,
            roomId: room.id,
            createdAt: new Date(Date.now() + index),
            updatedAt: new Date(Date.now() + index),
          },
        }),
      ),
    );

    const cities = await Promise.all(
      CITY_PRESETS.map((city, index) =>
        this.client.city.create({
          data: {
            ...city,
            roomId: room.id,
            createdAt: new Date(Date.now() + index),
            updatedAt: new Date(Date.now() + index),
          },
        }),
      ),
    );

    const cityByCode = new Map(cities.map((city) => [city.code, city.id]));

    await Promise.all(
      QUESTION_PRESETS.map((question, index) =>
        this.client.question.create({
          data: {
            prompt: question.prompt,
            choices: question.choices,
            correctIndex: question.correctIndex,
            region: question.region,
            roomId: room.id,
            cityId: question.cityCode ? cityByCode.get(question.cityCode) : undefined,
            createdAt: new Date(Date.now() + index),
            updatedAt: new Date(Date.now() + index),
          },
        }),
      ),
    );

    return room;
  }

  async roomExists(code: string) {
    const found = await this.client.room.findUnique({ where: { code } });
    return Boolean(found);
  }

  async getRoomMeta(code: string) {
    return this.client.room.findUnique({ where: { code } });
  }

  async getRoomWithState(code: string) {
    const room = await this.client.room.findUnique({
      where: { code },
      include: {
        teams: { orderBy: { createdAt: 'asc' } },
        cities: { include: { owner: true }, orderBy: { name: 'asc' } },
      },
    });
    if (!room) return null;
    return {
      room,
      teams: room.teams,
      cities: room.cities,
    };
  }

  async getCityForSelection(roomId: string, cityCode: string) {
    return this.client.city.findFirst({
      where: { roomId, code: cityCode },
      include: { owner: true },
    });
  }

  async selectQuestionForCity({ roomId, city }: { roomId: string; city: { id: string; region?: string | null } }) {
    const exact = await this.client.question.findFirst({
      where: { roomId, cityId: city.id },
      orderBy: { createdAt: 'asc' },
    });
    if (exact) return exact;

    const regional = await this.client.question.findFirst({
      where: {
        roomId,
        cityId: null,
        region: city.region ?? undefined,
      },
      orderBy: { createdAt: 'asc' },
    });
    if (regional) return regional;

    return this.client.question.findFirst({
      where: { roomId, cityId: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async recordAnswerLog({ teamId, questionId, cityId, isCorrect, isFirstCorrect }: Parameters<DataService['recordAnswerLog']>[0]) {
    await this.client.answerLog.create({
      data: {
        teamId,
        questionId,
        cityId,
        isCorrect,
        isFirstCorrect,
      },
    });
  }

  async assignCityOwner(cityId: string, teamId: string) {
    return this.client.city.update({
      where: { id: cityId },
      data: { ownerTeamId: teamId },
    });
  }

  async incrementTeamScore(teamId: string) {
    return this.client.team.update({
      where: { id: teamId },
      data: { score: { increment: 1 } },
    });
  }
}

declare global {
  
  var __memoryDataService: MemoryDataService | undefined;
}

const memoryService =
  globalThis.__memoryDataService ??
  (() => {
    const service = new MemoryDataService();
    globalThis.__memoryDataService = service;
    return service;
  })();

const dataService: DataService = prismaAvailable && prisma
  ? new PrismaDataService(prisma)
  : memoryService;

export { dataService };
