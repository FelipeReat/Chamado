// Biblioteca local placeholder removendo Supabase
export interface User {
  id: string
  email: string
  name: string
  role: 'user' | 'technician' | 'admin'
  created_at?: string
}

export const supabase = undefined as any
export const supabaseUrl = ''
export const supabaseAnonKey = ''

export interface Ticket {
  id: string
  title: string
  description: string
  category: 'Hardware' | 'Software' | 'Network' | 'Other'
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  status: 'Open' | 'In Progress' | 'Resolved'
  board_id: string | null
  requester_id: string
  assigned_to_id: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  requester?: User
  assigned_to?: User
}

export interface TicketComment {
  id: string
  ticket_id: string
  user_id: string
  comment: string
  created_at: string
  user?: User
}

export interface TicketFilters {
  status?: string
  category?: string
  priority?: string
  requester_id?: string
  assigned_to_id?: string
}
