import { create } from 'zustand'
import { getMembershipStatus } from '../services/api'

/*
  Estado de membresía Platinum. SIN persist a propósito: el backend es la
  única fuente de verdad (el estado se recalcula con el reloj del servidor
  en cada consulta). Manipular localStorage/DevTools no desbloquea nada:
  cada endpoint premium valida en el servidor de todos modos.
*/

export type EstadoMembresia = 'PLATINUM' | 'TRIAL_ACTIVO' | 'BLOQUEADO'

export interface Membresia {
  estado: EstadoMembresia
  motivo?: 'sin_trial' | 'trial_expirado'
  trialUsado: boolean
  msRestantes?: number
  diasRestantes?: number
  expiraEn?: string
}

interface MembershipState {
  membresia: Membresia | null
  loading: boolean
  error: boolean
  fetchMembresia: () => Promise<Membresia | null>
  setMembresia: (m: Membresia) => void
}

const useMembershipStore = create<MembershipState>((set) => ({
  membresia: null,
  loading: false,
  error: false,

  fetchMembresia: async () => {
    set({ loading: true, error: false })
    try {
      const data = await getMembershipStatus()
      const membresia = data?.membresia ?? null
      set({ membresia, loading: false })
      return membresia
    } catch (e) {
      console.error('Error consultando membresía:', e)
      set({ loading: false, error: true })
      return null
    }
  },

  setMembresia: (membresia) => set({ membresia, error: false }),
}))

export default useMembershipStore
