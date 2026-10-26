export type UserRole = 
  | 'INSTITUTION_ADMIN'
  | 'SCRUTINY_OFFICER'
  | 'APPROVING_AUTHORITY';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  designation?: string;
  institution_id?: string;
  institution_name?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  institution_id?: string;
  institution_name?: string;
}
