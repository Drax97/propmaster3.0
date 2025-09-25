"use client"

import * as React from "react"
import { useState } from "react"
import { 
  Download, 
  FileText, 
  Filter, 
  Calendar, 
  User, 
  CreditCard,
  BarChart3,
  Eye,
  EyeOff,
  Loader2,
  Save,
  Bookmark,
  Trash2,
  Star
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { BulkRecordSelector } from "@/components/ui/bulk-record-selector"

import { 
  EXPORT_FORMATS, 
  SORT_OPTIONS, 
  filterFinanceRecords, 
  sortFinanceRecords, 
  exportFinanceRecords,
  getFilterOptions
} from "@/lib/export/export"
import {
  getExportPresets,
  saveExportPreset,
  deleteExportPreset,
  validatePreset
} from "@/lib/export/export-presets"

export function FinanceExportModal({ 
  isOpen, 
  onClose, 
  records = [], 
  onExport 
}) {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    person: '',
    status: 'all',
    paymentType: 'all'
  })
  
  const [sortBy, setSortBy] = useState('DATE_DESC')
  const [exportFormat, setExportFormat] = useState(EXPORT_FORMATS.EXCEL)
  const [filename, setFilename] = useState('finance-records')
  const [showSensitive, setShowSensitive] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState('')
  const [presets, setPresets] = useState([])
  const [selectedPreset, setSelectedPreset] = useState('')
  const [showSavePreset, setShowSavePreset] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [newPresetDescription, setNewPresetDescription] = useState('')
  const [selectedRecordIds, setSelectedRecordIds] = useState([])
  const [useBulkSelection, setUseBulkSelection] = useState(false)

  // Get filter options from records
  const filterOptions = React.useMemo(() => getFilterOptions(records), [records])

  // Load presets on mount
  React.useEffect(() => {
    try {
      const loadedPresets = getExportPresets()
      setPresets(loadedPresets)
    } catch (error) {
      console.error('Error loading presets:', error)
    }
  }, [])

  // Apply filters and sorting
  const processedRecords = React.useMemo(() => {
    let recordsToProcess = records
    
    // If using bulk selection, filter to only selected records
    if (useBulkSelection && selectedRecordIds.length > 0) {
      recordsToProcess = records.filter(record => selectedRecordIds.includes(record.id))
    } else {
      // Apply normal filters
      recordsToProcess = filterFinanceRecords(records, filters)
    }
    
    return sortFinanceRecords(recordsToProcess, sortBy)
  }, [records, filters, sortBy, useBulkSelection, selectedRecordIds])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setError('')
  }

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      person: '',
      status: 'all',
      paymentType: 'all'
    })
    setSelectedPreset('')
    setError('')
  }

  const loadPreset = (presetId) => {
    const preset = presets.find(p => p.id === presetId)
    if (preset) {
      setFilters(preset.filters)
      setSortBy(preset.sortBy)
      setSelectedPreset(presetId)
      setError('')
    }
  }

  const saveCurrentAsPreset = () => {
    if (!newPresetName.trim()) {
      setError('Preset name is required')
      return
    }

    const preset = {
      name: newPresetName.trim(),
      description: newPresetDescription.trim(),
      filters,
      sortBy
    }

    const validationErrors = validatePreset(preset)
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '))
      return
    }

    try {
      const savedPreset = saveExportPreset(preset)
      const updatedPresets = getExportPresets()
      setPresets(updatedPresets)
      setSelectedPreset(savedPreset.id)
      setShowSavePreset(false)
      setNewPresetName('')
      setNewPresetDescription('')
      setError('')
    } catch (err) {
      setError('Failed to save preset: ' + err.message)
    }
  }

  const deletePreset = (presetId) => {
    try {
      deleteExportPreset(presetId)
      const updatedPresets = getExportPresets()
      setPresets(updatedPresets)
      if (selectedPreset === presetId) {
        setSelectedPreset('')
      }
    } catch (err) {
      setError('Failed to delete preset: ' + err.message)
    }
  }

  const handleExport = async () => {
    if (useBulkSelection && selectedRecordIds.length === 0) {
      setError('Please select at least one record to export.')
      return
    }
    
    if (processedRecords.length === 0) {
      setError('No records match your filters. Please adjust your criteria.')
      return
    }

    setIsExporting(true)
    setError('')

    try {
      const options = { showSensitive }
      const result = await exportFinanceRecords(
        processedRecords, 
        exportFormat, 
        filename, 
        options
      )
      
      // Call parent callback if provided
      if (onExport) {
        onExport({
          format: exportFormat,
          count: result.count,
          filters,
          sortBy
        })
      }

      // Close modal on success
      onClose()
    } catch (err) {
      setError(err.message || 'Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const getFormatIcon = (format) => {
    switch (format) {
      case EXPORT_FORMATS.EXCEL:
        return <BarChart3 className="h-4 w-4" />
      case EXPORT_FORMATS.PDF:
        return <FileText className="h-4 w-4" />
      default:
        return <Download className="h-4 w-4" />
    }
  }

  const getFormatLabel = (format) => {
    switch (format) {
      case EXPORT_FORMATS.EXCEL:
        return 'Excel (XLSX)'
      case EXPORT_FORMATS.PDF:
        return 'PDF (Portable Document)'
      default:
        return format.toUpperCase()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export Finance Records</span>
          </DialogTitle>
          <DialogDescription>
            Configure filters, sorting, and format options for your export
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Presets Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bookmark className="h-4 w-4" />
                <h3 className="font-medium">Quick Presets</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSavePreset(!showSavePreset)}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Current
              </Button>
            </div>

            <div className="flex flex-wrap gap-1 sm:gap-2">
              {presets.map(preset => (
                <div key={preset.id} className="flex items-center">
                  <Button
                    variant={selectedPreset === preset.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => loadPreset(preset.id)}
                    className="flex items-center space-x-1 text-xs sm:text-sm px-2 sm:px-3"
                  >
                    {preset.isDefault && <Star className="h-3 w-3" />}
                    <span className="truncate max-w-20 sm:max-w-none">{preset.name}</span>
                  </Button>
                  {!preset.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePreset(preset.id)}
                      className="ml-1 h-6 w-6 sm:h-8 sm:w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {showSavePreset && (
              <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
                <div className="space-y-2">
                  <Label>Preset Name</Label>
                  <Input
                    placeholder="My Export Preset"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Input
                    placeholder="Description of this preset..."
                    value={newPresetDescription}
                    onChange={(e) => setNewPresetDescription(e.target.value)}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" onClick={saveCurrentAsPreset}>
                    Save Preset
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowSavePreset(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Selection Mode Toggle */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="bulk-selection"
                checked={useBulkSelection}
                onCheckedChange={setUseBulkSelection}
              />
              <Label htmlFor="bulk-selection" className="cursor-pointer">
                Select specific records to export
              </Label>
              {useBulkSelection && (
                <Badge variant="outline">
                  {selectedRecordIds.length} selected
                </Badge>
              )}
            </div>

            {useBulkSelection && (
              <BulkRecordSelector
                records={records}
                selectedRecords={selectedRecordIds}
                onSelectionChange={setSelectedRecordIds}
              />
            )}
          </div>

          {!useBulkSelection && (
            <>
              <Separator />
              
              {/* Filters Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <h3 className="font-medium">Filters</h3>
              <Badge variant="outline">{processedRecords.length} records</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Date Range */}
              <div className="space-y-2 sm:col-span-2">
                <Label className="flex items-center space-x-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>Date Range</span>
                </Label>
                <DateRangePicker
                  dateFrom={filters.dateFrom}
                  dateTo={filters.dateTo}
                  onDateFromChange={(date) => handleFilterChange('dateFrom', date)}
                  onDateToChange={(date) => handleFilterChange('dateTo', date)}
                  placeholder="Select date range"
                />
              </div>

              {/* Person Filter */}
              <div className="space-y-2">
                <Label className="flex items-center space-x-2 text-sm">
                  <User className="h-4 w-4" />
                  <span>Person</span>
                </Label>
                <Input
                  placeholder="Search by client name..."
                  value={filters.person}
                  onChange={(e) => handleFilterChange('person', e.target.value)}
                  list="persons-list"
                  className="text-sm"
                />
                <datalist id="persons-list">
                  {filterOptions.persons.map(person => (
                    <option key={person} value={person} />
                  ))}
                </datalist>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-sm">Status</Label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Type Filter */}
              <div className="space-y-2 sm:col-span-2">
                <Label className="flex items-center space-x-2 text-sm">
                  <CreditCard className="h-4 w-4" />
                  <span>Payment Type</span>
                </Label>
                <Select value={filters.paymentType} onValueChange={(value) => handleFilterChange('paymentType', value)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {filterOptions.paymentTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button variant="outline" onClick={clearFilters} className="w-full">
              Clear All Filters
            </Button>
          </div>
            </>
          )}

          <Separator />

          {/* Sorting Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <h3 className="font-medium">Sorting</h3>
            </div>

            <div className="space-y-2">
              <Label>Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SORT_OPTIONS).map(([key, option]) => (
                    <SelectItem key={key} value={key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Export Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <h3 className="font-medium">Export Options</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Format Selection */}
              <div className="space-y-2">
                <Label className="text-sm">Export Format</Label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(EXPORT_FORMATS).map(format => (
                      <SelectItem key={format} value={format}>
                        <div className="flex items-center space-x-2">
                          {getFormatIcon(format)}
                          <span className="text-sm">{getFormatLabel(format)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filename */}
              <div className="space-y-2">
                <Label className="text-sm">Filename</Label>
                <Input
                  placeholder="finance-records"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Privacy Options */}
            <div className="flex items-start space-x-2">
              <Checkbox
                id="show-sensitive"
                checked={showSensitive}
                onCheckedChange={setShowSensitive}
                className="mt-1"
              />
              <Label htmlFor="show-sensitive" className="flex items-start space-x-2 cursor-pointer text-sm leading-relaxed">
                {showSensitive ? <Eye className="h-4 w-4 mt-0.5" /> : <EyeOff className="h-4 w-4 mt-0.5" />}
                <span>Include sensitive data (amounts, notes)</span>
              </Label>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isExporting}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || processedRecords.length === 0 || (useBulkSelection && selectedRecordIds.length === 0)}
            className="w-full sm:w-auto order-1 sm:order-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Exporting...</span>
                <span className="sm:hidden">Export...</span>
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Export {processedRecords.length} Records</span>
                <span className="sm:hidden">Export ({processedRecords.length})</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
