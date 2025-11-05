'use client';

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
    <main className="min-h-screen bg-slate-950 bg-[radial-gradient(circle_at_top,_#1f2937,_#020617)] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-10 px-6 py-12">
        <header className="space-y-4 text-center md:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">
            Coğrafya & Tarih
          </p>
          <h1 className="text-4xl font-bold md:text-5xl">
            Anadolu Hakimiyeti: Takım bazlı gerçek zamanlı bilgi oyunu
          </h1>
          <p className="text-base text-slate-300 md:max-w-2xl">
            Türkiye haritası üzerinde şehirleri fethederken 15 saniyelik sorularla rakiplerinizi geride
            bırakın. Misafir takma adınızla giriş yapın, oda kodu paylaşın ve ilk doğru cevabı vererek
            şehrin hakimi olun.
          </p>
        </header>

        <section className="grid gap-8 rounded-2xl bg-white/5 p-8 shadow-xl backdrop-blur md:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-6">
              <h2 className="text-lg font-semibold text-emerald-100">Hızlı Tek Kişilik Demo</h2>
              <p className="mt-2 text-sm text-emerald-100/80">
                Geliştirme sırasında doğrudan oyun ekranına geçmek için demo odayı otomatik oluşturup sizi
                bağlar. Başlamak için tek oyuncu yeterli.
              </p>
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
                className="mt-4 w-full rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? 'Yükleniyor...' : 'Demo olarak oyuna gir'}
              </button>
            </div>

            <div>
              <label htmlFor="nickname" className="block text-sm font-semibold text-slate-200">
                Takma adınız
              </label>
              <input
                id="nickname"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="Örn. BilgeKağan"
                maxLength={32}
                className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-base text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
              />
            </div>

            <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/50 p-6">
              <h2 className="text-lg font-semibold text-slate-100">Yeni oda oluştur</h2>
              <p className="text-sm text-slate-400">Sistem otomatik olarak 4 takımı dengeli şekilde ayarlar.</p>
              <button
                type="button"
                onClick={handleCreateRoom}
                disabled={isPending}
                className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? 'Oluşturuluyor...' : 'Yeni Oda Oluştur'}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="room-code" className="block text-sm font-semibold text-slate-200">
                Oda kodu
              </label>
              <input
                id="room-code"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="Örn. TEST01"
                maxLength={6}
                className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-base text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
              />
            </div>

            <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/50 p-6">
              <h2 className="text-lg font-semibold text-slate-100">Var olan odaya katıl</h2>
              <p className="text-sm text-slate-400">
                Oda kodunu paylaşan ekip üyelerinizle aynı odaya bağlanın.
              </p>
              <button
                type="button"
                onClick={handleJoinRoom}
                disabled={isPending}
                className="w-full rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? 'Katılıyorsunuz...' : 'Odaya Katıl'}
              </button>
              <p className="text-xs text-slate-500">
                Örnek: Seed verisiyle gelen demo oda kodu <span className="font-semibold text-slate-200">TEST01</span>
              </p>
            </div>
          </div>
        </section>

        {(error || info) && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm font-medium ${
              error
                ? 'border-rose-500/50 bg-rose-500/10 text-rose-100'
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
