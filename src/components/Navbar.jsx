import { Link } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { user } = useAuth()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur border-b border-dark-600">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/dashboard" className="font-display text-xl text-pink-300 tracking-tight">
          Recallify
        </Link>
        <div className="flex items-center gap-4">
          {user && (
            <>
              <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
              <button
                onClick={() => signOut(auth)}
                className="text-sm text-dark-400 hover:text-pink-300 transition-colors"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}