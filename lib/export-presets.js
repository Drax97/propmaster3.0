/**
 * Export preset management for saving and loading filter configurations
 */

const PRESETS_STORAGE_KEY = 'finance-export-presets'

export const DEFAULT_PRESETS = [
  {
    id: 'all-records',
    name: 'All Records',
    description: 'Export all financial records',
    filters: {
      dateFrom: '',
      dateTo: '',
      person: '',
      status: 'all',
      paymentType: 'all'
    },
    sortBy: 'DATE_DESC',
    isDefault: true
  },
  {
    id: 'current-month',
    name: 'Current Month',
    description: 'Records from this month',
    filters: {
      dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0],
      person: '',
      status: 'all',
      paymentType: 'all'
    },
    sortBy: 'DATE_DESC',
    isDefault: true
  },
  {
    id: 'pending-payments',
    name: 'Pending Payments',
    description: 'All unpaid records',
    filters: {
      dateFrom: '',
      dateTo: '',
      person: '',
      status: 'pending',
      paymentType: 'all'
    },
    sortBy: 'DATE_DESC',
    isDefault: true
  },
  {
    id: 'overdue-payments',
    name: 'Overdue Payments',
    description: 'Overdue payment records',
    filters: {
      dateFrom: '',
      dateTo: '',
      person: '',
      status: 'overdue',
      paymentType: 'all'
    },
    sortBy: 'DATE_DESC',
    isDefault: true
  }
]

/**
 * Get all presets (default + custom)
 */
export function getExportPresets() {
  try {
    const customPresets = JSON.parse(localStorage.getItem(PRESETS_STORAGE_KEY) || '[]')
    return [...DEFAULT_PRESETS, ...customPresets]
  } catch (error) {
    console.error('Error loading export presets:', error)
    return DEFAULT_PRESETS
  }
}

/**
 * Save a new preset
 */
export function saveExportPreset(preset) {
  try {
    const customPresets = JSON.parse(localStorage.getItem(PRESETS_STORAGE_KEY) || '[]')
    
    // Generate ID if not provided
    if (!preset.id) {
      preset.id = `custom-${Date.now()}`
    }
    
    // Add timestamp
    preset.createdAt = new Date().toISOString()
    preset.isDefault = false
    
    // Check if preset with same ID exists
    const existingIndex = customPresets.findIndex(p => p.id === preset.id)
    
    if (existingIndex >= 0) {
      // Update existing
      customPresets[existingIndex] = { ...preset, updatedAt: new Date().toISOString() }
    } else {
      // Add new
      customPresets.push(preset)
    }
    
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(customPresets))
    return preset
  } catch (error) {
    console.error('Error saving export preset:', error)
    throw new Error('Failed to save preset')
  }
}

/**
 * Delete a custom preset
 */
export function deleteExportPreset(presetId) {
  try {
    const customPresets = JSON.parse(localStorage.getItem(PRESETS_STORAGE_KEY) || '[]')
    const filteredPresets = customPresets.filter(p => p.id !== presetId)
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(filteredPresets))
    return true
  } catch (error) {
    console.error('Error deleting export preset:', error)
    throw new Error('Failed to delete preset')
  }
}

/**
 * Get a specific preset by ID
 */
export function getExportPreset(presetId) {
  const presets = getExportPresets()
  return presets.find(p => p.id === presetId)
}

/**
 * Validate preset data
 */
export function validatePreset(preset) {
  const errors = []
  
  if (!preset.name?.trim()) {
    errors.push('Preset name is required')
  }
  
  if (preset.name && preset.name.length > 50) {
    errors.push('Preset name must be 50 characters or less')
  }
  
  if (preset.description && preset.description.length > 200) {
    errors.push('Preset description must be 200 characters or less')
  }
  
  if (!preset.filters || typeof preset.filters !== 'object') {
    errors.push('Preset filters are required')
  }
  
  if (!preset.sortBy) {
    errors.push('Sort option is required')
  }
  
  return errors
}
