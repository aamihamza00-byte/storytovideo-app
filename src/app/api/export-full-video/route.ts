import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

export async function POST(req: Request) {
  try {
    const { scenes } = await req.json()

    if (!scenes || scenes.length === 0) {
      return NextResponse.json({ error: 'لا توجد مشاهد لتصديرها' }, { status: 400 })
    }

    // 1. إنشاء مجلد مؤقت
    const tempDir = path.join(os.tmpdir(), `full-video-${Date.now()}`)
    await fs.mkdir(tempDir, { recursive: true })

    const videoParts: string[] = []

    // 2. معالجة كل مشهد على حدة (صورة + صوت)
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i]
      if (!scene.image_url) continue

      const imagePath = path.join(tempDir, `image-${i}.jpg`)
      const audioPath = path.join(tempDir, `audio-${i}.mp3`)
      const videoPath = path.join(tempDir, `video-${i}.mp4`)

      // تحميل الصورة
      const imageRes = await fetch(scene.image_url)
      if (!imageRes.ok) continue
      const imageBuffer = await imageRes.arrayBuffer()
      await fs.writeFile(imagePath, Buffer.from(imageBuffer))

      // توليد الصوت
      const text = scene.dialogue || scene.description
      const encodedText = encodeURIComponent(text)
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=ar&client=tw-ob`
      
      const audioRes = await fetch(ttsUrl)
      if (!audioRes.ok) continue
      const audioBuffer = await audioRes.arrayBuffer()
      await fs.writeFile(audioPath, Buffer.from(audioBuffer))

      // دمج الصورة والصوت لهذا المشهد
      const ffmpegCommand = `ffmpeg -loop 1 -i "${imagePath}" -i "${audioPath}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "${videoPath}"`
      await execAsync(ffmpegCommand)

      videoParts.push(videoPath)
    }

    if (videoParts.length === 0) {
      throw new Error('لم يتم إنشاء أي مشهد صالح')
    }

    // 3. إنشاء ملف نصي لدمج جميع المشاهد
    const concatListPath = path.join(tempDir, 'concat.txt')
    const concatContent = videoParts.map(p => `file '${p}'`).join('\n')
    await fs.writeFile(concatListPath, concatContent)

    // 4. دمج جميع المشاهد في فيلم واحد
    const finalOutputPath = path.join(tempDir, 'final.mp4')
    const concatCommand = `ffmpeg -f concat -safe 0 -i "${concatListPath}" -c copy "${finalOutputPath}"`
    await execAsync(concatCommand)

    // 5. قراءة الفيديو النهائي وإرساله
    const finalVideoBuffer = await fs.readFile(finalOutputPath)
    const videoBase64 = finalVideoBuffer.toString('base64')
    const videoUrl = `data:video/mp4;base64,${videoBase64}`

    // 6. تنظيف الملفات المؤقتة
    await fs.rm(tempDir, { recursive: true, force: true })

    return NextResponse.json({ videoUrl })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
