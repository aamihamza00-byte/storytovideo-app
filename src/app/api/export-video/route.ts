import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

export async function POST(req: Request) {
  try {
    const { imageUrl, text } = await req.json()

    if (!imageUrl || !text) {
      return NextResponse.json({ error: 'الصورة والنص مطلوبان' }, { status: 400 })
    }

    // 1. إنشاء مجلد مؤقت
    const tempDir = path.join(os.tmpdir(), `video-${Date.now()}`)
    await fs.mkdir(tempDir, { recursive: true })

    const imagePath = path.join(tempDir, 'image.jpg')
    const audioPath = path.join(tempDir, 'audio.mp3')
    const outputPath = path.join(tempDir, 'output.mp4')

    // 2. تحميل الصورة
    const imageRes = await fetch(imageUrl)
    if (!imageRes.ok) throw new Error('فشل تحميل الصورة')
    const imageBuffer = await imageRes.arrayBuffer()
    await fs.writeFile(imagePath, Buffer.from(imageBuffer))

    // 3. توليد الصوت (باستخدام خدمة Google Translate TTS المجانية)
    const encodedText = encodeURIComponent(text)
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=ar&client=tw-ob`
    
    const audioRes = await fetch(ttsUrl)
    if (!audioRes.ok) throw new Error('فشل توليد الصوت')
    const audioBuffer = await audioRes.arrayBuffer()
    await fs.writeFile(audioPath, Buffer.from(audioBuffer))

    // 4. دمج الصورة والصوت في فيديو
    const ffmpegCommand = `ffmpeg -loop 1 -i "${imagePath}" -i "${audioPath}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "${outputPath}"`
    
    await execAsync(ffmpegCommand)

    // 5. قراءة الفيديو وإرساله
    const videoBuffer = await fs.readFile(outputPath)
    const videoBase64 = videoBuffer.toString('base64')
    const videoUrl = `data:video/mp4;base64,${videoBase64}`

    // 6. تنظيف الملفات المؤقتة
    await fs.rm(tempDir, { recursive: true, force: true })

    return NextResponse.json({ videoUrl })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
