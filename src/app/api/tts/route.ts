import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    if (!text) {
      return NextResponse.json({ error: 'النص مطلوب' }, { status: 400 })
    }

    // استخدام خدمة Google Translate TTS (مجانية وتعمل بدون مفتاح)
    const encodedText = encodeURIComponent(text)
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=ar&client=tw-ob`

    return NextResponse.json({ audioUrl: url })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
