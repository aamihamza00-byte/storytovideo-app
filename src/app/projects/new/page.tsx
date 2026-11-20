'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewProjectPage() {
  const [title, setTitle] = useState('')
  const [storyText, setStoryText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // جلب المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('يجب تسجيل الدخول أولاً')
      setLoading(false)
      return
    }

    // إدخال المشروع في قاعدة البيانات
    const { error } = await supabase.from('projects').insert({
      user_id: user.id,
      title: title,
      story_text: storyText,
      status: 'draft'
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // إذا نجح الحفظ، نعود للصفحة الرئيسية
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 flex justify-center">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-6">
        
        <div className="flex justify-between items-center border-b pb-4 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">إنشاء مشروع جديد</h1>
          <Link href="/" className="text-blue-500 hover:underline text-sm">العودة للرئيسية</Link>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">عنوان القصة</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="مثال: رحلة إلى القمر"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نص القصة</label>
            <textarea
              value={storyText}
              onChange={(e) => setStoryText(e.target.value)}
              required
              rows={10}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder="اكتب قصتك هنا..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'جاري الحفظ...' : 'حفظ المشروع والبدء'}
          </button>
        </form>
      </div>
    </div>
  )
}
