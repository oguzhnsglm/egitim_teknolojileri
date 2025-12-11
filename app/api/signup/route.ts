import { NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase-client';

export async function POST(request: Request) {
  try {
    if (!supabaseClient) {
      return NextResponse.json({ success: false, error: 'Supabase yapılandırılmamış.' }, { status: 500 });
    }

    const body = await request.json();
    const { firstName, lastName, email, password, organization } = body as Record<string, string>;

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ success: false, error: 'Lütfen tüm zorunlu alanları doldurun.' }, { status: 400 });
    }

    if (!email.toLowerCase().endsWith('@gmail.com')) {
      return NextResponse.json({ success: false, error: 'Gmail adresi gereklidir.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ success: false, error: 'Şifre en az 8 karakter olmalıdır.' }, { status: 400 });
    }

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,
        data: {
          firstName,
          lastName,
          organization: organization ?? '',
        },
      },
    });

    if (error || !data.user) {
      return NextResponse.json(
        { success: false, error: error?.message ?? 'Kayıt oluşturulamadı.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, userId: data.user.id });
  } catch (error) {
    console.error('[signup] unexpected error', error);
    return NextResponse.json({ success: false, error: 'Beklenmeyen bir hata oluştu.' }, { status: 500 });
  }
}
