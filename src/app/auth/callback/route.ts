import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // إذا كان هناك رابط للعودة إليه بعد الدخول، وإلا نعود للرئيسية
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // في حال حدوث خطأ، نعيد المستخدم لصفحة تسجيل الدخول مع رسالة
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`)
}
