import { useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { ArrowRight, Route, ShieldCheck } from 'lucide-react'

export default function AuthScreen({ showDemo }: { showDemo: () => void }) {
  const { signIn } = useAuthActions()
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signUp')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  return <main className="auth-page">
    <section className="auth-story">
      <a className="brand auth-brand" href="/" onClick={event => { event.preventDefault(); showDemo() }}><span className="brand-icon"><Route size={23}/></span>accessrelay<span className="brand-period">.</span></a>
      <p className="eyebrow">KNOW THE ROOM BEFORE YOU BOOK</p>
      <h1>Specific answers for the accessibility details that matter to you.</h1>
      <p>Compare what hotels publish, ask for what is missing, and keep every answer tied to its source and room type.</p>
      <ul>
        <li><ShieldCheck size={18}/> No generic “accessible” score</li>
        <li><ShieldCheck size={18}/> Features and date availability stay separate</li>
        <li><ShieldCheck size={18}/> You review every email before it can be sent</li>
      </ul>
      <button className="text-button auth-demo" onClick={showDemo}>Explore the fictional example <ArrowRight size={15}/></button>
    </section>
    <section className="auth-card" aria-labelledby="auth-title">
      <p className="eyebrow">FREE HACKATHON PREVIEW</p>
      <h2 id="auth-title">{mode === 'signUp' ? 'Create your private workspace' : 'Welcome back'}</h2>
      <p>{mode === 'signUp' ? 'Save a shortlist and run the real evidence workflow.' : 'Continue your saved comparisons.'}</p>
      <form onSubmit={async event => {
        event.preventDefault()
        setBusy(true)
        setError('')
        try {
          const data = new FormData(event.currentTarget)
          data.set('flow', mode)
          await signIn('password', data)
        } catch (reason) {
          setError(reason instanceof Error && reason.message ? reason.message : 'Could not sign in. Check your details and try again.')
        } finally { setBusy(false) }
      }}>
        <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
        <label>Password<input name="password" type="password" autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'} required minLength={8} maxLength={128}/></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signUp' ? 'Create workspace' : 'Sign in'} <ArrowRight size={17}/></button>
      </form>
      <button className="text-button auth-switch" onClick={() => { setMode(mode === 'signUp' ? 'signIn' : 'signUp'); setError('') }}>{mode === 'signUp' ? 'Already have an account? Sign in' : 'Need an account? Create one'}</button>
      <small>AccessRelay stores only the trip details and evidence you choose to add. Do not include medical records.</small>
    </section>
  </main>
}
