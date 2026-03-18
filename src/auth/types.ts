export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface AuthUser {
  userId: string
  continentalId: string
  email: string
  displayName: string
  isVerified: boolean
  createdAt: string | null
  updatedAt: string | null
  lastLoginAt: string | null
  lastLoginIp: string | null
}

export interface AuthSessionPayload {
  accessToken?: string
  token?: string
  userId?: string
  continentalId?: string
}
