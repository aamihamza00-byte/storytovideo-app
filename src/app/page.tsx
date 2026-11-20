import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { Plus, Film, LogOut, Sparkles, FolderOpen, LayoutDashboard } from 'lucide-react'

async function DashboardContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const userName = user.user_metadata?.full_name || user.email

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0A0A0F', color: '#E2E8F0', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* الشريط الجانبي */}
      <aside style={{ width: '250px', backgroundColor: '#141420', borderRight: '1px solid #2A2A40', display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px', fontSize: '20px', fontWeight: 'bold', color: 'white' }}>
          <Film color="#E040FB" size={24} />
          StoryToVideo
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', backgroundColor: '#1E1E30', borderRadius: '8px', color: 'white', textDecoration: 'none', border: '1px solid #2A2A40' }}>
            <LayoutDashboard color="#E040FB" size={20} />
            لوحة التحكم
          </Link>
          <Link href="/projects/new" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', color: '#A0AEC0', textDecoration: 'none' }}>
            <Plus size={20} />
            مشروع جديد
          </Link>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #2A2A40' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: 'linear-gradient(135deg, #E040FB, #7B2FBE)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white' }}>
              {userName?.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: '14px', color: 'white' }}>{userName}</span>
          </div>
          <Link href="/signout" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', color: '#A0AEC0', textDecoration: 'none', fontSize: '14px' }}>
            <LogOut size={16} />
            تسجيل الخروج
          </Link>
        </div>
      </aside>

      {/* المحتوى الرئيسي */}
      <main style={{ flex: 1, padding: '40px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          
          <div style={{ marginBottom: '40px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>مساء الخير، {userName?.split(' ')[0]} 👋</h1>
            <p style={{ color: '#A0AEC0', fontSize: '18px' }}>جاهز لتحويل قصتك القادمة إلى فيلم؟</p>
          </div>

          <Link href="/projects/new" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#141420', border: '1px solid #2A2A40', borderRadius: '16px', padding: '30px', textDecoration: 'none', marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'linear-gradient(135deg, #E040FB, #7B2FBE)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles color="white" size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: 'white', margin: 0 }}>ابدأ قصة جديدة</h2>
                <p style={{ color: '#A0AEC0', margin: '5px 0 0 0' }}>اكتب فكرتك، ودع الذكاء الاصطناعي يبني العالم.</p>
              </div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #E040FB, #7B2FBE)', padding: '12px 24px', borderRadius: '30px', color: 'white', fontWeight: 'bold' }}>
              إنشاء الآن
            </div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <FolderOpen color="#A0AEC0" size={24} />
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: 'white', margin: 0 }}>مشاريعي</h2>
            <span style={{ backgroundColor: '#1E1E30', color: '#A0AEC0', padding: '2px 10px', borderRadius: '20px', fontSize: '14px' }}>{projects?.length || 0}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {projects && projects.length > 0 ? (
              projects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`} style={{ backgroundColor: '#141420', border: '1px solid #2A2A40', borderRadius: '12px', padding: '20px', textDecoration: 'none', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <div style={{ backgroundColor: '#1E1E30', padding: '8px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <Film color="#E040FB" size={20} />
                    </div>
                    <span style={{ color: project.status === 'draft' ? '#D69E2E' : '#38A169', backgroundColor: project.status === 'draft' ? 'rgba(214, 158, 46, 0.1)' : 'rgba(56, 161, 105, 0.1)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}>
                      {project.status === 'draft' ? 'مسودة' : 'مكتمل'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', margin: '0 0 10px 0' }}>{project.title}</h3>
                  <p style={{ color: '#A0AEC0', fontSize: '14px', margin: '0 0 20px 0', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{project.story_text}</p>
                  <div style={{ marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid #2A2A40', color: '#4A4A6A', fontSize: '12px' }}>
                    {new Date(project.created_at).toLocaleDateString('ar-EG')}
                  </div>
                </Link>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', border: '1px dashed #2A2A40', borderRadius: '12px' }}>
                <p style={{ color: '#A0AEC0', marginBottom: '20px' }}>لا توجد مشاريع بعد. ابدأ الآن!</p>
                <Link href="/projects/new" style={{ background: 'linear-gradient(135deg, #E040FB, #7B2FBE)', padding: '10px 20px', borderRadius: '20px', color: 'white', textDecoration: 'none' }}>
                  + إنشاء مشروع جديد
                </Link>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#0A0A0F', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>جاري التحميل...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
