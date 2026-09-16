/** Types for NexaAI authentication and user profiles. */

export interface UserUsage {
  totalTokens: number;
  conversations: number;
  documents: number;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  usage?: UserUsage;
}

export interface AuthTokens {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user?: User;
}

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
