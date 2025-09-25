'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { 
  Archive, 
  ArchiveRestore, 
  Trash2, 
  RefreshCw, 
  Copy, 
  CheckSquare, 
  Square,
  AlertTriangle,
  Info,
  X
} from 'lucide-react'

export default function ArchiveManager({ 
  properties = [], 
  onPropertiesUpdate, 
  userRole = 'viewer',
  className = '' 
}) {
  const [selectedProperties, setSelectedProperties] = useState(new Set())
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentAction, setCurrentAction] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [archiveReason, setArchiveReason] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [bulkResults, setBulkResults] = useState(null)
  
  const { toast } = useToast()

  // Filter properties based on archive view
  const filteredProperties = properties.filter(property => {
    if (showArchived) {
      return property.status === 'archived'
    } else {
      return property.status !== 'archived'
    }
  })

  // Archive statistics
  const archiveStats = {
    total: properties.length,
    archived: properties.filter(p => p.status === 'archived').length,
    active: properties.filter(p => p.status !== 'archived').length,
    selected: selectedProperties.size
  }

  // Available bulk actions based on user role and selection
  const availableActions = [
    {
      id: 'archive',
      label: 'Archive Properties',
      icon: Archive,
      variant: 'secondary',
      requiresReason: true,
      description: 'Move properties to archive (can be restored later)',
      minRole: 'editor',
      disabled: selectedProperties.size === 0 || showArchived
    },
    {
      id: 'unarchive',
      label: 'Restore Properties',
      icon: ArchiveRestore,
      variant: 'secondary',
      requiresReason: false,
      description: 'Restore archived properties to active status',
      minRole: 'editor',
      disabled: selectedProperties.size === 0 || !showArchived
    },
    {
      id: 'updateStatus',
      label: 'Update Status',
      icon: RefreshCw,
      variant: 'secondary',
      requiresStatus: true,
      description: 'Change status of selected properties',
      minRole: 'editor',
      disabled: selectedProperties.size === 0 || showArchived
    },
    {
      id: 'duplicate',
      label: 'Duplicate Properties',
      icon: Copy,
      variant: 'outline',
      requiresReason: false,
      description: 'Create copies of selected properties',
      minRole: 'editor',
      disabled: selectedProperties.size === 0
    },
    {
      id: 'delete',
      label: 'Delete Properties',
      icon: Trash2,
      variant: 'destructive',
      requiresReason: false,
      description: 'Permanently delete properties (cannot be undone)',
      minRole: 'master',
      disabled: selectedProperties.size === 0
    }
  ]

  // Check if user has permission for an action
  const canPerformAction = (action) => {
    const roleHierarchy = { viewer: 0, editor: 1, master: 2 }
    const userLevel = roleHierarchy[userRole] || 0
    const requiredLevel = roleHierarchy[action.minRole] || 2
    return userLevel >= requiredLevel
  }

  // Select/deselect all properties
  const handleSelectAll = () => {
    if (selectedProperties.size === filteredProperties.length) {
      setSelectedProperties(new Set())
    } else {
      setSelectedProperties(new Set(filteredProperties.map(p => p.id)))
    }
  }

  // Toggle individual property selection
  const handlePropertySelect = (propertyId) => {
    const newSelected = new Set(selectedProperties)
    if (newSelected.has(propertyId)) {
      newSelected.delete(propertyId)
    } else {
      newSelected.add(propertyId)
    }
    setSelectedProperties(newSelected)
  }

  // Open action dialog
  const openActionDialog = (action) => {
    setCurrentAction(action)
    setArchiveReason('')
    setNewStatus('')
    setBulkResults(null)
    setIsDialogOpen(true)
  }

  // Execute bulk action
  const executeBulkAction = async () => {
    if (!currentAction || selectedProperties.size === 0) return

    setIsProcessing(true)
    
    try {
      const requestBody = {
        action: currentAction.id,
        propertyIds: Array.from(selectedProperties)
      }

      // Add additional parameters based on action
      if (currentAction.requiresReason && archiveReason.trim()) {
        requestBody.archiveReason = archiveReason.trim()
      }
      
      if (currentAction.requiresStatus && newStatus) {
        requestBody.newStatus = newStatus
      }

      const response = await fetch('/api/properties/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (response.ok) {
        setBulkResults(data)
        
        // Show success toast
        toast({
          title: 'Bulk Operation Successful',
          description: `${data.successful} properties processed successfully${data.failed > 0 ? `, ${data.failed} failed` : ''}`,
          variant: data.failed > 0 ? 'destructive' : 'default'
        })

        // Refresh properties list
        if (onPropertiesUpdate) {
          onPropertiesUpdate()
        }

        // Clear selection if all operations were successful
        if (data.failed === 0) {
          setSelectedProperties(new Set())
        }
      } else {
        throw new Error(data.error || 'Bulk operation failed')
      }
    } catch (error) {
      console.error('Bulk operation error:', error)
      toast({
        title: 'Operation Failed',
        description: error.message || 'Failed to perform bulk operation',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Close dialog and reset state
  const closeDialog = () => {
    setIsDialogOpen(false)
    setCurrentAction(null)
    setArchiveReason('')
    setNewStatus('')
    setBulkResults(null)
  }

  // Status options for bulk update
  const statusOptions = [
    { value: 'available', label: 'Available' },
    { value: 'occupied', label: 'Occupied' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'sold', label: 'Sold' },
    { value: 'pending', label: 'Pending' }
  ]

  // Add private option for master users
  if (userRole === 'master') {
    statusOptions.push({ value: 'private', label: 'Private' })
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Archive Statistics */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{archiveStats.total}</span> total properties
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">{archiveStats.active}</span> active
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">{archiveStats.archived}</span> archived
          </div>
          {selectedProperties.size > 0 && (
            <div className="text-sm text-blue-600">
              <span className="font-medium">{selectedProperties.size}</span> selected
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={showArchived ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setShowArchived(!showArchived)
              setSelectedProperties(new Set()) // Clear selection when switching views
            }}
          >
            <Archive className="w-4 h-4 mr-2" />
            {showArchived ? 'Show Active' : 'Show Archived'}
          </Button>
        </div>
      </div>

      {/* Selection Controls */}
      {filteredProperties.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={selectedProperties.size === filteredProperties.length && filteredProperties.length > 0}
              onCheckedChange={handleSelectAll}
              className="mr-2"
            />
            <span className="text-sm text-gray-600">
              {selectedProperties.size === filteredProperties.length && filteredProperties.length > 0
                ? `All ${filteredProperties.length} properties selected`
                : `${selectedProperties.size} of ${filteredProperties.length} properties selected`
              }
            </span>
          </div>

          {selectedProperties.size > 0 && (
            <div className="flex items-center space-x-2">
              {availableActions
                .filter(action => canPerformAction(action) && !action.disabled)
                .map(action => (
                  <Button
                    key={action.id}
                    variant={action.variant}
                    size="sm"
                    onClick={() => openActionDialog(action)}
                    disabled={isProcessing}
                  >
                    <action.icon className="w-4 h-4 mr-2" />
                    {action.label}
                  </Button>
                ))
              }
            </div>
          )}
        </div>
      )}

      {/* Property List with Selection */}
      <div className="space-y-2">
        {filteredProperties.map(property => (
          <div
            key={property.id}
            className={`flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors ${
              selectedProperties.has(property.id) ? 'border-blue-500 bg-blue-50' : ''
            }`}
          >
            <Checkbox
              checked={selectedProperties.has(property.id)}
              onCheckedChange={() => handlePropertySelect(property.id)}
            />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-medium text-gray-900 truncate">
                  {property.name}
                </h3>
                <Badge variant={property.status === 'archived' ? 'secondary' : 'default'}>
                  {property.status}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                {property.location && (
                  <span>{property.location}</span>
                )}
                {property.price && (
                  <span>${property.price.toLocaleString()}</span>
                )}
                {property.archived_at && (
                  <span>Archived: {new Date(property.archived_at).toLocaleDateString()}</span>
                )}
              </div>
              
              {property.archive_reason && (
                <div className="mt-1 text-sm text-gray-600">
                  <span className="font-medium">Reason:</span> {property.archive_reason}
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredProperties.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Archive className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">
              {showArchived ? 'No Archived Properties' : 'No Active Properties'}
            </p>
            <p>
              {showArchived 
                ? 'You haven\'t archived any properties yet.'
                : 'All properties are currently archived.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Bulk Action Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {currentAction && <currentAction.icon className="w-5 h-5" />}
              <span>{currentAction?.label}</span>
            </DialogTitle>
            <DialogDescription>
              {currentAction?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Show selected properties count */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This action will affect <strong>{selectedProperties.size}</strong> selected properties.
              </AlertDescription>
            </Alert>

            {/* Archive reason input */}
            {currentAction?.requiresReason && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Archive Reason</label>
                <Textarea
                  placeholder="Enter reason for archiving these properties..."
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            )}

            {/* Status selection */}
            {currentAction?.requiresStatus && (
              <div className="space-y-2">
                <label className="text-sm font-medium">New Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Bulk operation results */}
            {bulkResults && (
              <div className="space-y-2">
                <Alert variant={bulkResults.failed > 0 ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">Operation Results:</div>
                    <div>✅ Successful: {bulkResults.successful}</div>
                    {bulkResults.failed > 0 && (
                      <div>❌ Failed: {bulkResults.failed}</div>
                    )}
                  </AlertDescription>
                </Alert>

                {bulkResults.errors && bulkResults.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto text-sm">
                    <div className="font-medium text-red-600 mb-1">Errors:</div>
                    {bulkResults.errors.map((error, index) => (
                      <div key={index} className="text-red-600">
                        • {error.error}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Warning for destructive actions */}
            {currentAction?.id === 'delete' && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> This action cannot be undone. Properties and all associated data will be permanently deleted.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              variant={currentAction?.variant || 'default'}
              onClick={executeBulkAction}
              disabled={
                isProcessing || 
                (currentAction?.requiresReason && !archiveReason.trim()) ||
                (currentAction?.requiresStatus && !newStatus)
              }
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {currentAction && <currentAction.icon className="w-4 h-4 mr-2" />}
                  Confirm {currentAction?.label}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
