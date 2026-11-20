'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignOutPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const signOut = async () => {
      await supabase.auth.signOut()
      router.push('/login')
    }
    signOut()
  }, [router, supabase])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <p className="text-gray-500">جاري تسجيل الخروج...</p>
    </div>
  )
}
