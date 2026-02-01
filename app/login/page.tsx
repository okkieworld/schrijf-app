'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // We maken de client hier aan met de nieuwe SSR methode
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert('Helaas, geen toegang: ' + error.message)
      setLoading(false)
    } else {
      // Belangrijk: refresh zorgt dat de middleware de nieuwe sessie ziet
      router.refresh()
      router.push('/') 
    }
  }

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '80vh', 
      fontFamily: 'sans-serif',
      backgroundColor: '#f4f4f4'
    }}>
      <form 
        onSubmit={handleLogin} 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '15px', 
          width: '350px',
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}
      >
        <h2 style={{ margin: '0 0 10px 0', textAlign: 'center', color: '#333' }}>
          Codex Architect
        </h2>
        <p style={{ fontSize: '14px', color: '#666', textAlign: 'center', marginBottom: '10px' }}>
          Beveiligde toegang voor Hugo & Damiano
        </p>
        
        <input 
          name="email" 
          type="email" 
          placeholder="E-mailadres" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        
        <input 
          name="password" 
          type="password" 
          placeholder="Wachtwoord" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            padding: '12px', 
            cursor: loading ? 'not-allowed' : 'pointer', 
            backgroundColor: '#1a1a1a', 
            color: 'white', 
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Bezig met verifiëren...' : 'Inloggen'}
        </button>
      </form>
    </div>
  )
}