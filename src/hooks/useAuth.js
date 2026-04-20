import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'

export function useAuth() {
  const [user, setUser] = useState(null)     // ✅ start with null (NOT undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u || null)   // ✅ always normalize to null
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return { user, loading }
}