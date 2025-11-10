import axios from 'axios'

export interface Settings {
  statuses?: StatusConfig[]
  formFields?: FormField[]
  kanban?: KanbanConfig
  accessControl?: AccessControlConfig
}

export interface StatusConfig {
  id: string
  name: string
  color: string
  icon: string
  order: number
}

export interface FormField {
  id: string
  name: string
  type: 'text' | 'number' | 'email' | 'date' | 'select' | 'textarea' | 'user' | 'department'
  required: boolean
  placeholder?: string
  helpText?: string
  options?: string[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
  order: number
}

export interface KanbanConfig {
  columns: KanbanColumn[]
  cardFields: {
    showAssignee: boolean
    showDueDate: boolean
    showPriority: boolean
    showTags: boolean
    showDescription: boolean
    showCreatedDate: boolean
    showStatus: boolean
  }
}

export interface KanbanColumn {
  id: string
  name: string
  statusIds: string[]
  wipLimit?: number
  color: string
  order: number
}

export interface AccessControlConfig {
  permissions: Permission[]
  changeLog: ChangeLog[]
}

export interface Permission {
  id: string
  name: string
  description: string
  adminOnly: boolean
}

export interface ChangeLog {
  id: string
  timestamp: string
  user: string
  action: string
  details: string
}

const API_BASE = '/api'

export const settingsApi = {
  // Configurações gerais
  async getSettings(): Promise<Settings> {
    const response = await axios.get(`${API_BASE}/settings`)
    return response.data
  },

  async updateSettings(settings: Settings): Promise<void> {
    await axios.put(`${API_BASE}/settings`, settings)
  },

  // Status
  async createStatus(status: StatusConfig): Promise<void> {
    await axios.post(`${API_BASE}/settings/statuses`, status)
  },

  async updateStatus(id: string, status: Partial<StatusConfig>): Promise<void> {
    await axios.put(`${API_BASE}/settings/statuses/${id}`, status)
  },

  async deleteStatus(id: string): Promise<void> {
    await axios.delete(`${API_BASE}/settings/statuses/${id}`)
  },

  async reorderStatuses(statusIds: string[]): Promise<void> {
    await axios.put(`${API_BASE}/settings/statuses/reorder`, { statusIds })
  },

  // Reset
  async resetToDefault(): Promise<void> {
    await axios.post(`${API_BASE}/settings/reset`)
  },

  // Export/Import
  async exportSettings(): Promise<string> {
    const response = await axios.get(`${API_BASE}/settings/export`)
    return response.data
  },

  async importSettings(settings: Settings): Promise<void> {
    await axios.post(`${API_BASE}/settings/import`, settings)
  }
}