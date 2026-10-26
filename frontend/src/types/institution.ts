export interface Institution {
  id: string;
  code: string;
  name: string;
  application_ref?: string;
  state: string;
  city: string;
  pincode?: string;
  contact_email: string;
  contact_phone?: string;
  address?: string;
  is_active: boolean;
  total_fdrs?: number;
  total_deposit_amount?: number;
  created_at: string;
}
