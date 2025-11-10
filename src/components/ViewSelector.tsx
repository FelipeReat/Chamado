import { useState, useEffect } from 'react'
import { List, LayoutGrid, Monitor, Moon, Sun } from 'lucide-react'

export type ViewMode = 'list' | 'kanban'
export type ThemeMode = 'light' | 'dark' | 'system'

interface ViewSelectorProps {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  themeMode?: ThemeMode
  setThemeMode?: (mode: ThemeMode) => void
  className?: string
}

const LOCAL_STORAGE_KEY = 'ticket-view-preferences'

interface ViewPreferences {
  viewMode: ViewMode
  themeMode?: ThemeMode
  timestamp: number
}

export function saveViewPreferences(preferences: Omit<ViewPreferences, 'timestamp'>) {
  try {
    const data: ViewPreferences = {
      ...preferences,
      timestamp: Date.now()
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.warn('Não foi possível salvar preferências no localStorage:', error)
  }
}

export function loadViewPreferences(): ViewPreferences | null {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored) as ViewPreferences
      // Validar se os dados são recentes (menos de 30 dias)
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000
      if (Date.now() - data.timestamp < thirtyDaysInMs) {
        return data
      }
    }
  } catch (error) {
    console.warn('Não foi possível carregar preferências do localStorage:', error)
  }
  return null
}

export default function ViewSelector({ 
  viewMode, 
  setViewMode, 
  themeMode, 
  setThemeMode, 
  className = '' 
}: ViewSelectorProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    saveViewPreferences({ 
      viewMode: mode,
      themeMode 
    })
  }

  const handleThemeModeChange = (mode: ThemeMode) => {
    if (setThemeMode) {
      setThemeMode(mode)
      saveViewPreferences({ 
        viewMode,
        themeMode: mode 
      })
    }
  }

  const getThemeIcon = (mode: ThemeMode) => {
    switch (mode) {
      case 'light':
        return <Sun className="w-4 h-4" />
      case 'dark':
        return <Moon className="w-4 h-4" />
      case 'system':
        return <Monitor className="w-4 h-4" />
      default:
        return <Monitor className="w-4 h-4" />
    }
  }

  if (!isMounted) {
    return (
      <div className={`flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg ${className}`}>
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-16 rounded-md"></div>
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-16 rounded-md"></div>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {/* Seletor de Visualização */}
      <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg" role="group" aria-label="Seletor de visualização">
        <button
          onClick={() => handleViewModeChange('list')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            viewMode === 'list'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
          aria-pressed={viewMode === 'list'}
          aria-label="Modo Lista"
          title="Visualizar em lista"
        >
          <List className="w-4 h-4" />
          <span className="hidden sm:inline">Lista</span>
        </button>
        
        <button
          onClick={() => handleViewModeChange('kanban')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            viewMode === 'kanban'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
          aria-pressed={viewMode === 'kanban'}
          aria-label="Modo Kanban"
          title="Visualizar em Kanban"
        >
          <LayoutGrid className="w-4 h-4" />
          <span className="hidden sm:inline">Kanban</span>
        </button>
      </div>

      {/* Seletor de Tema (opcional) */}
      {setThemeMode && (
        <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg" role="group" aria-label="Seletor de tema">
          <button
            onClick={() => handleThemeModeChange('light')}
            className={`p-2 rounded-md text-sm font-medium transition-all duration-200 ${
              themeMode === 'light'
                ? 'bg-white dark:bg-gray-700 text-yellow-600 dark:text-yellow-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
            aria-pressed={themeMode === 'light'}
            aria-label="Tema claro"
            title="Tema claro"
          >
            <Sun className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => handleThemeModeChange('dark')}
            className={`p-2 rounded-md text-sm font-medium transition-all duration-200 ${
              themeMode === 'dark'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
            aria-pressed={themeMode === 'dark'}
            aria-label="Tema escuro"
            title="Tema escuro"
          >
            <Moon className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => handleThemeModeChange('system')}
            className={`p-2 rounded-md text-sm font-medium transition-all duration-200 ${
              themeMode === 'system'
                ? 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
            aria-pressed={themeMode === 'system'}
            aria-label="Tema do sistema"
            title="Usar tema do sistema"
          >
            <Monitor className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

// Hook customizado para gerenciar preferências
export function useViewPreferences() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [themeMode, setThemeMode] = useState<ThemeMode>('system')

  useEffect(() => {
    // Carregar preferências do localStorage
    const preferences = loadViewPreferences()
    if (preferences) {
      setViewMode(preferences.viewMode)
      if (preferences.themeMode) {
        setThemeMode(preferences.themeMode)
      }
    }
  }, [])

  useEffect(() => {
    // Salvar preferências quando mudarem
    saveViewPreferences({ viewMode, themeMode })
  }, [viewMode, themeMode])

  return { viewMode, setViewMode, themeMode, setThemeMode }
}