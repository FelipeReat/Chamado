import axios from 'axios'

// Use relative base path to go through Vite proxy and avoid CORS issues
const API_URL = import.meta.env.VITE_API_URL || '/api'

export interface NotificationData {
  ticketId: string
  assignedToId?: string
  previousStatus?: string
  comment?: string
  commentedById?: string
  updatedById?: string
}

export async function sendTicketCreatedNotification(data: NotificationData): Promise<void> {
  try {
    await axios.post(`${API_URL}/notifications/ticket-created`, data)
  } catch (error) {
    console.error('Error sending ticket created notification:', error)
    // Don't throw error to not break the main flow
  }
}

export async function sendTicketUpdatedNotification(data: NotificationData): Promise<void> {
  try {
    await axios.post(`${API_URL}/notifications/ticket-updated`, data)
  } catch (error) {
    console.error('Error sending ticket updated notification:', error)
    // Don't throw error to not break the main flow
  }
}

export async function sendNewCommentNotification(data: NotificationData): Promise<void> {
  try {
    await axios.post(`${API_URL}/notifications/new-comment`, data)
  } catch (error) {
    console.error('Error sending comment notification:', error)
    // Don't throw error to not break the main flow
  }
}

export async function sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
  try {
    await axios.post(`${API_URL}/notifications/password-reset`, { email, resetLink })
  } catch (error) {
    console.error('Error sending password reset email:', error)
    throw error // Throw this one as it's important for the user
  }
}