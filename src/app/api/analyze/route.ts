import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { storyText } = await req.json()

    if (!storyText) {
      return NextResponse.json({ error: 'نص القصة مطلوب' }, { status: 400 })
    }

    const prompt = `
      أنت مخرج سينمائي. قم بتحليل القصة التالية وتقسيمها إلى مشاهد.
      أرجع النتيجة بتنسيق JSON فقط (بدون أي نص إضافي) بحيث يكون كالتالي:
      {
        "scenes": [
          {
            "scene_number": 1,
            "description": "وصف المشهد باللغة العربية",
            "dialogue": "الحوار إن وجد باللغة العربية",
            "visual_prompt": "A highly detailed cinematic prompt in English to generate this scene image later"
          }
        ]
      }
      القصة: ${storyText}
    `

    // استخدام Groq API مع النموذج الجديد
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b', // تم تغيير النموذج هنا
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      }),
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'فشل الاتصال بالذكاء الاصطناعي')
    }

    const result = JSON.parse(data.choices[0].message.content)
    return NextResponse.json(result)

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
