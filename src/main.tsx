import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexReactClient, useConvexAuth } from 'convex/react'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import './index.css'
import App from './App.tsx'
import AuthScreen from './AuthScreen.tsx'
import LiveApp from './LiveApp.tsx'

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null

function ConnectedRoot() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const [live, setLive] = useState(() => new URLSearchParams(window.location.search).get('workspace') !== 'demo')
  if (!live) return <App onOpenLive={() => setLive(true)}/>
  if (isLoading) return <div className="loading-page">Opening AccessRelay…</div>
  if (!isAuthenticated) return <AuthScreen showDemo={() => setLive(false)}/>
  return <LiveApp showDemo={() => setLive(false)}/>
}

function UnconnectedRoot() {
  const [demo, setDemo] = useState(() => new URLSearchParams(window.location.search).get('workspace') === 'demo')
  if (demo) return <App/>
  return <main className="empty-workspace"><h1>Find a stay. Verify the room.</h1><p>The saved hotel workspace is not connected in this build.</p><p>You can explore the clearly labeled fictional London example while the connection is restored.</p><button className="secondary" onClick={() => setDemo(true)}>View fictional London demo</button></main>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>{convex ? <ConvexAuthProvider client={convex}><ConnectedRoot/></ConvexAuthProvider> : <UnconnectedRoot/>}</StrictMode>,
)
