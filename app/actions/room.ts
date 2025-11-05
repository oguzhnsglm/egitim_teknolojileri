'use server';

import { dataService } from '@/lib/data-service';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRoomCode() {
  const length = 5;
  let code = '';
  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * CODE_ALPHABET.length);
    code += CODE_ALPHABET[randomIndex];
  }
  return code;
}

export async function createRoomAction() {
  try {
    let code = '';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateRoomCode();
      const exists = await dataService.roomExists(candidate);
      if (!exists) {
        code = candidate;
        break;
      }
    }

    if (!code) {
      return { success: false, message: 'Uygun oda kodu üretilemedi.' };
    }

    const room = await dataService.createRoomWithPresets(code);
    return { success: true, code: room.code };
  } catch (error) {
    console.error('[createRoomAction] error', error);
    return { success: false, message: 'Oda oluşturulamadı.' };
  }
}

export async function validateRoomCodeAction(roomCode: string) {
  const normalized = roomCode.trim().toUpperCase();
  if (!normalized) {
    return { exists: false };
  }

  const room = await dataService.getRoomMeta(normalized);
  return { exists: Boolean(room), code: room?.code ?? normalized };
}
