import { PrismaClient } from '@prisma/client';
import { CITY_PRESETS, QUESTION_PRESETS, TEAM_PRESETS } from '../lib/fixtures';

const prisma = new PrismaClient();

async function main() {
  await prisma.answerLog.deleteMany();
  await prisma.question.deleteMany();
  await prisma.city.deleteMany();
  await prisma.team.deleteMany();
  await prisma.room.deleteMany();

  const room = await prisma.room.create({
    data: {
      code: 'TEST01',
    },
  });

  const teams = await Promise.all(
    TEAM_PRESETS.map((team) =>
      prisma.team.create({
        data: {
          ...team,
          roomId: room.id,
        },
      }),
    ),
  );

  const cities = await Promise.all(
    CITY_PRESETS.map((city) =>
      prisma.city.create({
        data: {
          ...city,
          roomId: room.id,
        },
      }),
    ),
  );

  const cityByCode = new Map(cities.map((city) => [city.code, city]));

  await prisma.$transaction(
    QUESTION_PRESETS.map((question) =>
      prisma.question.create({
        data: {
          prompt: question.prompt,
          choices: question.choices,
          correctIndex: question.correctIndex,
          region: question.region,
          roomId: room.id,
          cityId: question.cityCode ? cityByCode.get(question.cityCode)?.id : undefined,
        },
      }),
    ),
  );

  console.log(
    `Seed completed. Room ${room.code} with ${teams.length} teams and ${cities.length} cities ready.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
