'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

export default function LoginPage() {
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('Bu demo sürümde kimlik doğrulama henüz etkin değil.');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#050915] via-[#072144] to-[#110a2e] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-10 px-6 py-16">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-semibold">Tekrar hoş geldiniz</h1>
          <p className="text-base text-slate-100/80">
            Anadolu Hakimiyeti hesabınıza giriş yapın ve oyuna kaldığınız yerden devam edin.
          </p>
        </div>

        <section className="rounded-3xl border border-white/12 bg-slate-950/60 p-10 shadow-2xl shadow-black/40 backdrop-blur-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-100/90">
                  E-posta adresi
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-2 w-full rounded-xl border border-white/12 bg-slate-950/60 px-4 py-3 text-base text-white shadow-inner shadow-black/20 outline-none transition focus:border-[#d000ff] focus:ring-4 focus:ring-[#d000ff]/30"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-100/90">
                  Şifre
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="mt-2 w-full rounded-xl border border-white/12 bg-slate-950/60 px-4 py-3 text-base text-white shadow-inner shadow-black/20 outline-none transition focus:border-[#d000ff] focus:ring-4 focus:ring-[#d000ff]/30"
                />
              </div>
            </div>

            <button
              type="submit"
              className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-[#d000ff] via-[#8a2eff] to-[#4b5dff] px-5 py-3 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(208,0,255,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d000ff]"
            >
              <span className="transition-transform duration-300 group-hover:scale-[1.02]">Giriş yap</span>
            </button>
          </form>

          <div className="mt-6 flex justify-between text-sm text-slate-200/80">
            <Link href="/register" className="transition hover:text-white">
              Hesabınız yok mu? Kayıt olun
            </Link>
            <Link href="/" className="transition hover:text-white">
              Ana sayfa
            </Link>
          </div>

          {status && (
            <p className="mt-6 rounded-xl border border-[#d000ff]/40 bg-[#d000ff]/10 px-4 py-3 text-sm text-white/90 shadow-lg">
              {status}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
