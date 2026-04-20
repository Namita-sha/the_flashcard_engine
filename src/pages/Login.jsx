import { signInWithPopup } from 'firebase/auth'
import { auth, provider } from '../firebase'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useEffect } from 'react'

export default function Login() {
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    if (user) navigate('/dashboard')
  }, [user])

  async function handleLogin() {
    try {
      await signInWithPopup(auth, provider)
      navigate('/dashboard')
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center px-6">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-pink-400/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-md w-full text-center">
        <h1 className="font-display text-6xl text-white mb-3">Recallify</h1>
        <p className="font-body text-dark-400 text-lg mb-2">
          Active recall + spaced repetition.
        </p>
        <p className="font-body text-dark-400 text-sm mb-12">
          Upload any PDF. Get smart flashcards. Study what you need, when you need it.
        </p>

        <button
          onClick={handleLogin}
          className="w-full py-4 rounded-2xl bg-pink-300 text-dark-900 font-body font-semibold text-base hover:bg-pink-200 active:scale-95 transition-all"
        >
          Continue with Google
        </button>

        <p className="text-dark-500 text-xs font-body mt-8">
          Your data is private and tied to your account.
        </p>
      </div>
    </div>
  )
}