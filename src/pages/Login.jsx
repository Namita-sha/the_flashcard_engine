import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

const provider = new GoogleAuthProvider()

export default function Login() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true })
  }, [user, loading])

  async function handleLogin() {
    try {
      await signInWithPopup(auth, provider)
      navigate('/dashboard', { replace: true })
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') {
        console.error(e)
      }
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-dark-900">
      <div className="w-8 h-8 border-2 border-pink-300 rounded-full border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="flex items-center justify-center min-h-screen px-6 bg-dark-900">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl text-white font-display">Recallify</h1>
          <p className="text-sm leading-relaxed text-dark-400 font-body">
            Turn any PDF into a smart flashcard deck.<br />
            Spaced repetition. Active recall. Long-term memory.
          </p>
        </div>
        <div className="p-8 border bg-dark-700 border-dark-500 rounded-2xl">
          <p className="mb-6 text-sm text-dark-400 font-body">Sign in to get started</p>
          <button
            onClick={handleLogin}
            className="flex items-center justify-center w-full gap-3 py-3 text-sm font-semibold text-gray-800 transition-all bg-white rounded-xl font-body hover:bg-gray-100 active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.805.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>
        </div>
        <p className="mt-6 text-xs text-dark-500 font-body">
          Your decks are private and tied to your Google account.
        </p>
      </div>
    </div>
  )
}