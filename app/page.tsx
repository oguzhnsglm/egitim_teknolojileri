'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createRoomAction, validateRoomCodeAction } from './actions/room';
import { useGameStore } from '@/lib/state';

export default function LobbyPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const setNicknameStore = useGameStore((state) => state.setNickname);
  const resetStore = useGameStore((state) => state.reset);

  useEffect(() => {
    resetStore();
  }, [resetStore]);

  const handleCreateRoom = () => {
    if (!nickname.trim()) {
      setError('Lütfen bir takma ad girin.');
      return;
    }
    setError(null);
    setInfo('Oda oluşturuluyor...');

    startTransition(async () => {
      const result = await createRoomAction();
      if (!result.success || !result.code) {
        setInfo(null);
        setError(result.message ?? 'Oda oluşturulamadı.');
        return;
      }
      setNicknameStore(nickname.trim());
      setInfo('Oda hazır! Yönlendiriliyorsunuz...');
      router.push(`/room/${result.code}`);
    });
  };

  const handleJoinRoom = () => {
    if (!nickname.trim()) {
      setError('Lütfen bir takma ad girin.');
      return;
    }
    if (!joinCode.trim()) {
      setError('Oda kodu gerekli.');
      return;
    }

    const normalized = joinCode.trim().toUpperCase();
    setError(null);
    setInfo('Oda doğrulanıyor...');

    startTransition(async () => {
      const result = await validateRoomCodeAction(normalized);
      if (!result.exists || !result.code) {
        setInfo(null);
        setError('Böyle bir oda bulunamadı.');
        return;
      }
      setNicknameStore(nickname.trim());
      setInfo('Odaya katılıyorsunuz...');
      router.push(`/room/${result.code}`);
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#050915] via-[#072144] to-[#110a2e]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-12 px-6 py-16">
        <header className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="space-y-5 text-center md:max-w-2xl md:text-left">
            <h1 className="text-4xl font-bold text-white md:text-5xl">
              Anadolu Hakimiyeti ile takımlar halinde Türkiye haritasını fethedin
            </h1>
            <p className="text-lg text-slate-100/80">
              Demo odaya tek tuşla girin veya kodla arkadaşlarınızı davet edin.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 md:flex-row">
            <Link
              href="/login"
              className="group relative inline-flex min-w-[140px] items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white shadow-md backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
            >
              <span className="transition-transform duration-300 group-hover:scale-[1.02]">Giriş Yap</span>
            </Link>
            <Link
              href="/register"
              className="group relative inline-flex min-w-[140px] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-[#d000ff] via-[#8a2eff] to-[#4b5dff] px-5 py-3 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(208,0,255,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d000ff]"
            >
              <span className="transition-transform duration-300 group-hover:scale-[1.02]">Kayıt Ol</span>
            </Link>
          </div>
        </header>

        <section className="grid gap-8 rounded-3xl border border-white/12 bg-slate-950/40 p-10 shadow-2xl shadow-black/40 backdrop-blur-2xl md:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/12 bg-slate-950/60 p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-white">Hızlı Tek Kişilik Demo</h2>
              <button
                type="button"
                onClick={() => {
                  const effectiveNickname = nickname.trim() || 'Tek Oyuncu';
                  setNickname(effectiveNickname);
                  setInfo('Demo oda hazırlanıyor...');
                  setError(null);
                  startTransition(async () => {
                    const result = await createRoomAction();
                    if (!result.success || !result.code) {
                      setInfo(null);
                      setError(result.message ?? 'Demo oda oluşturulamadı.');
                      return;
                    }
                    setNicknameStore(effectiveNickname);
                    setInfo('Oyun ekranına yönlendiriliyorsunuz...');
                    router.push(`/room/${result.code}`);
                  });
                }}
                disabled={isPending}
                className="group relative mt-6 inline-flex w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-[#d000ff] via-[#8a2eff] to-[#4b5dff] px-5 py-3 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(208,0,255,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d000ff] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
              >
                <span className="transition-transform duration-300 group-hover:scale-[1.02]">
                  {isPending ? 'Yükleniyor...' : 'Demo olarak oyuna gir'}
                </span>
              </button>
            </div>

            <div>
              <label htmlFor="nickname" className="block text-base font-semibold text-slate-100/90">
                Takma adınız
              </label>
              <input
                id="nickname"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="Örn. BilgeKağan"
                maxLength={32}
                className="mt-3 w-full rounded-xl border border-white/12 bg-slate-950/60 px-4 py-3 text-base text-white shadow-inner shadow-black/20 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/30"
              />
            </div>

            <div className="space-y-5 rounded-2xl border border-white/12 bg-slate-950/60 p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-white">Yeni oda oluştur</h2>
              <button
                type="button"
                onClick={handleCreateRoom}
                disabled={isPending}
                className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-[#d000ff] via-[#8a2eff] to-[#4b5dff] px-5 py-3 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(208,0,255,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d000ff] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
              >
                <span className="transition-transform duration-300 group-hover:scale-[1.02]">
                  {isPending ? 'Oluşturuluyor...' : 'Yeni Oda Oluştur'}
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="room-code" className="block text-base font-semibold text-slate-100/90">
                Oda kodu
              </label>
              <input
                id="room-code"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="Örn. TEST01"
                maxLength={6}
                className="mt-3 w-full rounded-xl border border-white/12 bg-slate-950/60 px-4 py-3 text-base text-white shadow-inner shadow-black/20 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/30"
              />
            </div>

            <div className="space-y-5 rounded-2xl border border-white/12 bg-slate-950/60 p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-white">Var olan odaya katıl</h2>
              <button
                type="button"
                onClick={handleJoinRoom}
                disabled={isPending}
                className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-[#d000ff] via-[#8a2eff] to-[#4b5dff] px-5 py-3 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(208,0,255,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d000ff] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
              >
                <span className="transition-transform duration-300 group-hover:scale-[1.02]">
                  {isPending ? 'Katılıyorsunuz...' : 'Odaya Katıl'}
                </span>
              </button>
            </div>
          </div>
        </section>

        {(error || info) && (
          <div
            className={`rounded-xl border px-5 py-3 text-base font-medium shadow-lg ${
              error
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-100'
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
            }`}
          >
            {error ?? info}
          </div>
        )}
      </div>
    </main>
  );
}
