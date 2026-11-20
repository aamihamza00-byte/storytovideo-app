'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Sparkles, Volume2, Image as ImageIcon, Loader2, Film } from 'lucide-react'

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [scenes, setScenes] = useState<any[]>([])
  const [characters, setCharacters] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null)
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null)
  const [exportingVideoId, setExportingVideoId] = useState<string | null>(null)
  const [exportingFullVideo, setExportingFullVideo] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchProject = async () => {
      const resolvedParams = await params
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', resolvedParams.id)
        .eq('user_id', user.id)
        .single()

      if (projectError || !projectData) {
        setError('المشروع غير موجود')
        setLoading(false)
        return
      }
      setProject(projectData)

      // جلب المشاهد
      const { data: scenesData } = await supabase
        .from('scenes')
        .select('*')
        .eq('project_id', resolvedParams.id)
        .order('scene_number', { ascending: true })

      if (scenesData) setScenes(scenesData)

      // جلب الشخصيات
      const { data: charsData } = await supabase
        .from('characters')
        .select('*')
        .eq('project_id', resolvedParams.id)
      
      if (charsData) setCharacters(charsData)

      setLoading(false)
    }
    fetchProject()
  }, [params, router, supabase])

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setError(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyText: project.story_text })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const resolvedParams = await params

      // حفظ الشخصيات
      if (data.characters && data.characters.length > 0) {
        const charsToInsert = data.characters.map((char: any) => ({
          project_id: resolvedParams.id,
          name: char.name,
          age_group: char.age_group,
          gender: char.gender
        }))
        const { data: insertedChars } = await supabase.from('characters').insert(charsToInsert).select()
        if (insertedChars) setCharacters(insertedChars)
      }

      // حفظ المشاهد
      const scenesToInsert = data.scenes.map((scene: any) => ({
        project_id: resolvedParams.id,
        scene_number: scene.scene_number,
        description: scene.description,
        dialogue: scene.dialogue,
        visual_prompt: scene.visual_prompt,
        speaker: scene.speaker
      }))

      const { data: insertedScenes, error: insertError } = await supabase.from('scenes').insert(scenesToInsert).select()
      if (insertError) throw new Error(insertError.message)

      setScenes(insertedScenes || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleGenerateImage = async (scene: any) => {
    setGeneratingImageId(scene.id)
    setError(null)
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: scene.visual_prompt })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const { error: updateError } = await supabase
        .from('scenes')
        .update({ image_url: data.imageUrl })
        .eq('id', scene.id)

      if (updateError) throw new Error(updateError.message)

      setScenes(scenes.map(s => s.id === scene.id ? { ...s, image_url: data.imageUrl } : s))

    } catch (err: any) {
      setError(err.message)
    } finally {
      setGeneratingImageId(null)
    }
  }

  const handlePlayAudio = (scene: any) => {
    if (!scene.dialogue && !scene.description) {
      setError('لا يوجد نص للنطق في هذا المشهد.')
      return
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      
      setPlayingAudioId(scene.id)
      const textToSpeak = scene.dialogue || scene.description
      
      const utterance = new SpeechSynthesisUtterance(textToSpeak)
      utterance.lang = 'ar-SA' 
      utterance.rate = 0.9

      // جلب الأصوات المتاحة
      const voices = window.speechSynthesis.getVoices()
      const arabicVoices = voices.filter(v => v.lang.startsWith('ar'))
      
      if (arabicVoices.length > 0) {
        const speakerChar = characters.find(c => c.name === scene.speaker)
        
        if (speakerChar) {
          if (speakerChar.gender === 'female') {
            const femaleVoice = arabicVoices.find(v => 
              v.name.toLowerCase().includes('female') || 
              v.name.toLowerCase().includes('woman') ||
              v.name.includes('Hala') || 
              v.name.includes('Zariyah')
            )
            utterance.voice = femaleVoice || arabicVoices[0]
          } else {
            utterance.voice = arabicVoices[0]
          }
        } else {
          utterance.voice = arabicVoices[0]
        }
      }

      utterance.onend = () => setPlayingAudioId(null)
      utterance.onerror = (event) => {
        setError('فشل النطق: ' + event.error)
        setPlayingAudioId(null)
      }

      window.speechSynthesis.speak(utterance)
    } else {
      setError('متصفحك لا يدعم خاصية النطق الصوتي.')
    }
  }

  const handleExportVideo = async (scene: any) => {
    if (!scene.image_url) {
      setError('يجب توليد صورة لهذا المشهد أولاً.')
      return
    }
    setExportingVideoId(scene.id)
    setError(null)
    try {
      const res = await fetch('/api/export-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: scene.image_url, text: scene.dialogue || scene.description })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const link = document.createElement('a')
      link.href = data.videoUrl
      link.download = `scene-${scene.scene_number}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setExportingVideoId(null)
    }
  }

  const handleExportFullVideo = async () => {
    const scenesWithImages = scenes.filter(s => s.image_url)
    if (scenesWithImages.length === 0) {
      setError('يجب توليد صور للمشاهد أولاً.')
      return
    }

    setExportingFullVideo(true)
    setError(null)
    try {
      const res = await fetch('/api/export-full-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes: scenesWithImages })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const link = document.createElement('a')
      link.href = data.videoUrl
      link.download = `full-movie.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setExportingFullVideo(false)
    }
  }

  if (loading) return <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0F', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>جاري التحميل...</div>
  if (!project) return <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0F', color: 'red', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>المشروع غير موجود</div>

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0F', color: '#E2E8F0', fontFamily: 'system-ui, sans-serif', padding: '20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#A0AEC0', textDecoration: 'none', marginBottom: '20px' }}>
          <ArrowRight size={20} />
          العودة للرئيسية
        </Link>

        <div style={{ backgroundColor: '#141420', border: '1px solid #2A2A40', borderRadius: '16px', padding: '30px', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '20px' }}>{project.title}</h1>
          
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', marginBottom: '10px' }}>نص القصة:</h3>
            <p style={{ color: '#A0AEC0', lineHeight: '1.6' }}>{project.story_text}</p>
          </div>

          {error && <div style={{ backgroundColor: 'rgba(229, 62, 62, 0.1)', color: '#FC8181', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>{error}</div>}

          {scenes.length === 0 ? (
            <button 
              onClick={handleAnalyze} 
              disabled={analyzing}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'linear-gradient(135deg, #38A169, #2F855A)', color: 'white', border: 'none', padding: '15px 30px', borderRadius: '30px', fontSize: '16px', fontWeight: 'bold', cursor: analyzing ? 'not-allowed' : 'pointer', opacity: analyzing ? 0.7 : 1 }}
            >
              {analyzing ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
              {analyzing ? 'جاري التحليل...' : '✨ تحليل القصة وتوليد المشاهد'}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ fontSize: '22px', fontWeight: 'bold', color: '#38A169', margin: 0 }}>المشاهد</h3>
                <button
                  onClick={handleExportFullVideo}
                  disabled={exportingFullVideo || scenes.every((s: any) => !s.image_url)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #E040FB, #7B2FBE)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '30px', cursor: exportingFullVideo ? 'not-allowed' : 'pointer', opacity: exportingFullVideo ? 0.7 : 1, fontWeight: 'bold' }}
                >
                  {exportingFullVideo ? <Loader2 className="animate-spin" size={18} /> : <Film size={18} />}
                  {exportingFullVideo ? 'جاري تصدير الفيلم...' : '🎬 تصدير الفيلم كاملاً'}
                </button>
              </div>

              {scenes.map((scene: any) => (
                <div key={scene.id} style={{ backgroundColor: '#1E1E30', border: '1px solid #2A2A40', borderRadius: '12px', padding: '20px' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', marginBottom: '10px' }}>المشهد {scene.scene_number}</h4>
                  {scene.speaker && <p style={{ fontSize: '14px', color: '#E040FB', marginBottom: '10px' }}>المتحدث: {scene.speaker}</p>}
                  <p style={{ color: '#A0AEC0', marginBottom: '15px' }}>{scene.description}</p>
                  
                  <div style={{ backgroundColor: '#0A0A0F', padding: '10px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #2A2A40' }}>
                    <p style={{ color: '#63B3ED', fontSize: '14px', margin: 0 }}>الحوار: {scene.dialogue}</p>
                  </div>
                  
                  {scene.image_url ? (
                    <img src={scene.image_url} alt={`مشهد ${scene.scene_number}`} style={{ width: '100%', borderRadius: '8px', marginBottom: '15px' }} />
                  ) : (
                    <button
                      onClick={() => handleGenerateImage(scene)}
                      disabled={generatingImageId === scene.id}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#7B2FBE', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '20px', cursor: generatingImageId === scene.id ? 'not-allowed' : 'pointer', opacity: generatingImageId === scene.id ? 0.7 : 1, marginBottom: '15px' }}
                    >
                      {generatingImageId === scene.id ? <Loader2 className="animate-spin" size={16} /> : <ImageIcon size={16} />}
                      {generatingImageId === scene.id ? 'جاري توليد الصورة...' : '🎨 توليد صورة لهذا المشهد'}
                    </button>
                  )}

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handlePlayAudio(scene)}
                      disabled={playingAudioId === scene.id}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#2B6CB0', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '20px', cursor: playingAudioId === scene.id ? 'not-allowed' : 'pointer', opacity: playingAudioId === scene.id ? 0.7 : 1 }}
                    >
                      <Volume2 size={16} />
                      {playingAudioId === scene.id ? 'جاري الاستماع...' : '🔊 استمع للحوار'}
                    </button>

                    {scene.image_url && (
                      <button
                        onClick={() => handleExportVideo(scene)}
                        disabled={exportingVideoId === scene.id}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#D69E2E', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '20px', cursor: exportingVideoId === scene.id ? 'not-allowed' : 'pointer', opacity: exportingVideoId === scene.id ? 0.7 : 1 }}
                      >
                        {exportingVideoId === scene.id ? <Loader2 className="animate-spin" size={16} /> : <Film size={16} />}
                        {exportingVideoId === scene.id ? 'جاري التصدير...' : '🎬 تصدير الفيديو'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
