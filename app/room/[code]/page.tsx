'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TurkeyMap from '@/components/TurkeyMap';
import Countdown from '@/components/Countdown';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { useGameStore } from '@/lib/state';
import type { QuestionPayload, RoomState } from '@/types/realtime';

const ANSWER_REASON_MESSAGES: Record<string, string> = {
  not_joined: 'Önce odaya katılmalısınız.',
  question_in_progress: 'Aktif bir soru yanıtlanıyor.',
  city_not_found: 'Şehir bulunamadı.',
  occupied: 'Bu şehir başka bir takıma ait.',
  no_question_available: 'Bu şehir için soru bulunamadı.',
  server_error: 'Sunucu hatası. Tekrar deneyin.',
  no_active_question: 'Aktif soru yok.',
  too_late: 'Süre doldu. Bir sonraki soruyu bekleyin.',
  already_answered: 'Bu soruya zaten yanıt verdiniz.',
};

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();

  const roomCode = useMemo(() => params?.code?.toString().toUpperCase() ?? '', [params]);
  const nickname = useGameStore((state) => state.nickname);
  const teamId = useGameStore((state) => state.teamId);
  const roomState = useGameStore((state) => state.roomState);
  const activeQuestion = useGameStore((state) => state.activeQuestion);
  const answerStatus = useGameStore((state) => state.answerStatus);
  const answerMessage = useGameStore((state) => state.answerMessage);
  const answeredChoice = useGameStore((state) => state.answeredChoice);

  const setAssignment = useGameStore((state) => state.setAssignment);
  const setRoomState = useGameStore((state) => state.setRoomState);
  const setActiveQuestion = useGameStore((state) => state.setActiveQuestion);
  const setAnswerStatus = useGameStore((state) => state.setAnswerStatus);
  const setNickname = useGameStore((state) => state.setNickname);

  useEffect(() => {
    if (!roomCode) {
      router.replace('/');
    }
  }, [roomCode, router]);

  useEffect(() => {
    if (!roomCode) return;
    void fetch('/api/socket').catch(() => undefined);
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode || !nickname) {
      return;
    }

    const socket = getSocket();

    const handleConnect = () => {
      socket.emit('join_room', { roomCode, nickname });
    };

    const handleJoinedRoom = (payload: { roomCode: string; teamId: string; nickname: string }) => {
      setAssignment(payload);
      setAnswerStatus(undefined, undefined, undefined);
    };

    const handleJoinError = (payload: { message: string }) => {
      setAnswerStatus('late', undefined, payload.message ?? 'Odaya katılım hatası.');
      router.replace('/');
    };

    const handleRoomState = (state: RoomState) => {
      if (state) {
        setRoomState(state);
      }
    };

    const handleQuestionStarted = (question: QuestionPayload) => {
      setActiveQuestion(question);
      setAnswerStatus(undefined, undefined, undefined);
    };

    const handleQuestionTimeout = ({ cityCode }: { cityCode: string }) => {
      setActiveQuestion(undefined);
      setAnswerStatus('late', undefined, `${cityCode} sorusunda süre doldu.`);
    };

    const handleAnswerAck = (payload: { accepted: boolean; reason?: string }) => {
      if (payload.accepted) {
        setAnswerStatus('pending', answeredChoice, 'Cevabınız alındı, sonuç bekleniyor.');
      } else if (payload.reason) {
        const message = ANSWER_REASON_MESSAGES[payload.reason] ?? 'Cevap kabul edilmedi.';
        const status = payload.reason === 'too_late' ? 'late' : 'wrong';
        setAnswerStatus(status, undefined, message);
      }
    };

    const handleAnswerResult = (payload: {
      cityCode: string;
      teamId?: string;
      wasCorrect: boolean;
      nickname?: string;
      message?: string;
    }) => {
      setActiveQuestion(undefined);
      if (!payload.wasCorrect) {
        setAnswerStatus('wrong', undefined, payload.message ?? 'Yanlış cevap.');
        return;
      }

      if (payload.teamId && payload.teamId === teamId) {
        setAnswerStatus('correct', undefined, 'Tebrikler! Şehri ele geçirdiniz.');
      } else {
        const winner = payload.nickname ?? 'Rakip takım';
        if (answeredChoice !== undefined) {
          setAnswerStatus('late', undefined, `${winner} doğru yanıtı verdi.`);
        } else {
          setAnswerStatus(undefined, undefined, undefined);
        }
      }
    };

    socket.on('connect', handleConnect);
    socket.on('joined_room', handleJoinedRoom);
    socket.on('join_error', handleJoinError);
    socket.on('room_state', handleRoomState);
    socket.on('question_started', handleQuestionStarted);
    socket.on('question_timeout', handleQuestionTimeout);
    socket.on('answer_ack', handleAnswerAck);
    socket.on('answer_result', handleAnswerResult);

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('joined_room', handleJoinedRoom);
      socket.off('join_error', handleJoinError);
      socket.off('room_state', handleRoomState);
      socket.off('question_started', handleQuestionStarted);
      socket.off('question_timeout', handleQuestionTimeout);
      socket.off('answer_ack', handleAnswerAck);
      socket.off('answer_result', handleAnswerResult);
      if (socket.connected) {
        socket.emit('leave_room');
      }
      disconnectSocket();
    };
  }, [
    roomCode,
    nickname,
    setAssignment,
    setRoomState,
    setActiveQuestion,
    setAnswerStatus,
    teamId,
    router,
    answeredChoice,
  ]);

  const submitAnswer = useCallback(
    (choiceIndex: number) => {
      if (!activeQuestion) return;
      const socket = getSocket();
      socket.emit('submit_answer', { choiceIndex });
      setAnswerStatus('pending', choiceIndex, 'Cevabınız gönderildi.');
    },
    [activeQuestion, setAnswerStatus],
  );

  useEffect(() => {
    if (!activeQuestion) {
      window.removeEventListener('keydown', handleHotkey);
      return;
    }

    function handleHotkey(event: KeyboardEvent) {
      const mapping: Record<string, number> = {
        '1': 0,
        '2': 1,
        '3': 2,
        '4': 3,
      };
      if (mapping[event.key] !== undefined) {
        event.preventDefault();
        submitAnswer(mapping[event.key]);
      }
    }

    window.addEventListener('keydown', handleHotkey);
    return () => window.removeEventListener('keydown', handleHotkey);
  }, [activeQuestion, submitAnswer]);

  const handleMapSelect = useCallback(
    (cityCode: string) => {
      if (!teamId || activeQuestion) return;
      const socket = getSocket();
      socket.emit('select_city', { cityCode });
      setAnswerStatus('pending', undefined, `${cityCode} için soru çağrıldı.`);
    },
    [teamId, activeQuestion, setAnswerStatus],
  );

  if (!nickname) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="max-w-md rounded-2xl border border-slate-700 bg-slate-900/80 p-8 text-center">
          <h1 className="text-2xl font-semibold">Devam etmek için takma adınızı girin</h1>
          <p className="mt-2 text-sm text-slate-400">
            Lobiye geri dönerek kullanıcı adınızı seçebilir veya aşağıdan hızlıca belirleyebilirsiniz.
          </p>
          <NicknamePrompt onConfirm={setNickname} />
        </div>
      </main>
    );
  }

  const teams = roomState?.teams ?? [];
  const cities = roomState?.cities ?? [];
  const logEntries = roomState?.log ?? [];
  const myTeam = teams.find((team) => team.id === teamId);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-6 px-4 py-8 md:px-8">
        <header className="flex flex-col gap-2 border-b border-slate-800 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Oda</p>
            <h1 className="text-2xl font-semibold text-white md:text-3xl">Kod: {roomCode}</h1>
            {myTeam && (
              <p className="text-sm text-slate-400">
                Takımınız: <span style={{ color: myTeam.color }}>{myTeam.name}</span> — Skor: {myTeam.score}
              </p>
            )}
          </div>
          <div className="text-sm text-slate-400">Oyuncu: {nickname}</div>
        </header>

        <section className="flex flex-col gap-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
            <header className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Türkiye Haritası</h2>
              {activeQuestion ? (
                <Countdown expiresAt={activeQuestion.expiresAt} />
              ) : (
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
                  Haritadan şehir seçin
                </span>
              )}
            </header>
            <TurkeyMap
              cities={cities}
              activeCityCode={activeQuestion?.cityCode}
              onSelect={handleMapSelect}
              disabled={!teamId || Boolean(activeQuestion)}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-100">Takımlar</h2>
              <ul className="mt-4 space-y-2">
                {teams.map((team) => (
                  <li
                    key={team.id}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                      team.id === teamId
                        ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100'
                        : 'border-slate-800 bg-slate-900/70 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />
                      <span>{team.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>Oyuncu: {team.members}</span>
                      <span>Skor: {team.score}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-100">Aktif Soru</h2>
              {activeQuestion ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300">
                    <span className="font-semibold text-slate-100">
                      {cityNameFromCode(activeQuestion.cityCode, cities)}
                    </span>{' '}
                    için sorunuz:
                  </p>
                  <h3 className="text-base font-semibold text-white">{activeQuestion.prompt}</h3>
                  <div className="space-y-2">
                    {activeQuestion.choices.map((choice, index) => {
                      const isSelected = answeredChoice === index;
                      const variant =
                        answerStatus === 'correct'
                          ? 'success'
                          : answerStatus === 'wrong'
                          ? 'danger'
                          : 'default';
                      const baseClasses =
                        'w-full rounded-xl border px-4 py-3 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400';
                      let stateClasses = 'border-slate-700 bg-slate-800 hover:bg-slate-700/80';
                      if (isSelected) {
                        stateClasses = 'border-emerald-400 bg-emerald-500/20';
                      }
                      if (variant === 'success' && isSelected) {
                        stateClasses = 'border-emerald-500 bg-emerald-500/30 text-emerald-100';
                      } else if (variant === 'danger' && isSelected) {
                        stateClasses = 'border-rose-500 bg-rose-500/20 text-rose-200';
                      }
                      return (
                        <button
                          key={choice}
                          type="button"
                          onClick={() => submitAnswer(index)}
                          className={`${baseClasses} ${stateClasses}`}
                          disabled={answerStatus === 'pending'}
                        >
                          <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/60 text-xs text-slate-300">
                            {index + 1}
                          </span>
                          {choice}
                        </button>
                      );
                    })}
                  </div>
                  {answerMessage && (
                    <p
                      className={`rounded-lg px-3 py-2 text-xs ${
                        answerStatus === 'correct'
                          ? 'bg-emerald-500/20 text-emerald-200'
                          : answerStatus === 'wrong'
                          ? 'bg-rose-500/20 text-rose-200'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {answerMessage}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">Klavye kısayolu: 1-4 tuşlarıyla yanıt verin.</p>
                </div>
              ) : (
                <div className="space-y-3 text-sm text-slate-300">
                  <p>Şehir seçmek için haritaya tıklayın. Şehir boşsa 15 saniyelik soru başlar.</p>
                  <p>Doğru cevabı ilk veren takım şehri ele geçirir ve takım rengine boyanır.</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-100">Olay Günlüğü</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              {logEntries.length === 0 && <li>Henüz olay yok. İlk şehri siz fethedin!</li>}
              {logEntries.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-200"
                >
                  <p>{entry.message}</p>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                    {new Date(entry.timestamp).toLocaleTimeString('tr-TR')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}

function cityNameFromCode(code: string, cities: { code: string; name: string }[]) {
  return cities.find((city) => city.code === code)?.name ?? code;
}

function NicknamePrompt({ onConfirm }: { onConfirm: (nickname: string) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!value.trim()) {
          setError('Takma ad boş olamaz.');
          return;
        }
        onConfirm(value.trim());
      }}
    >
      <input
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          if (error) setError(null);
        }}
        placeholder="Örn. BilgeKağan"
        maxLength={32}
        className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
      />
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <button
        type="submit"
        className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
      >
        Devam Et
      </button>
    </form>
  );
}
