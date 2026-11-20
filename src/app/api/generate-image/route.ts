import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: 'الوصف (prompt) مطلوب' }, { status: 400 })
    }

    // 1. توليد الصورة عبر Pollinations AI
    const encodedPrompt = encodeURIComponent(prompt)
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`

    const imageResponse = await fetch(pollinationsUrl)
    if (!imageResponse.ok) {
      throw new Error(`فشل توليد الصورة من Pollinations: ${imageResponse.statusText}`)
    }
    
    const imageBuffer = await imageResponse.arrayBuffer()
    const buffer = Buffer.from(imageBuffer)

    // 2. رفع الصورة إلى Supabase Storage
    const supabase = await createClient()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-images')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        upsert: false
      })

    if (uploadError) {
      // هنا سنطبع الخطأ الحقيقي القادم من Supabase
      throw new Error(`فشل رفع الصورة إلى Supabase: ${uploadError.message}`)
    }

    // 3. الحصول على الرابط العام
    const { data: urlData } = supabase.storage
      .from('project-images')
      .getPublicUrl(uploadData.path)

    return NextResponse.json({ imageUrl: urlData.publicUrl })

  } catch (error: any) {
    // إرجاع الخطأ الحقيقي للواجهة
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
