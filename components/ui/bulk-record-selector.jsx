"use client"

import * as React from "react"
import { useState } from "react"
import { 
  CheckSquare, 
  Square, 
  SquareMinus,
  Search,
  Filter
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"

export function BulkRecordSelector({ 
  records = [], 
  selectedRecords = [],
  onSelectionChange,
  className = ""
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Filter records based on search and status
  const filteredRecords = React.useMemo(() => {
    return records.filter(record => {
      const matchesSearch = !searchTerm || 
        record.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.properties?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === "all" || record.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }, [records, searchTerm, statusFilter])

  // Selection state calculations
  const selectedCount = selectedRecords.length
  const totalCount = filteredRecords.length
  const isAllSelected = totalCount > 0 && selectedCount === totalCount
  const isPartialSelected = selectedCount > 0 && selectedCount < totalCount

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all
      onSelectionChange([])
    } else {
      // Select all filtered records
      onSelectionChange(filteredRecords.map(r => r.id))
    }
  }

  const handleSelectRecord = (recordId, checked) => {
    if (checked) {
      onSelectionChange([...selectedRecords, recordId])
    } else {
      onSelectionChange(selectedRecords.filter(id => id !== recordId))
    }
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-orange-100 text-orange-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      case 'partial': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with bulk actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="flex items-center space-x-2"
          >
            {isAllSelected ? (
              <CheckSquare className="h-4 w-4" />
            ) : isPartialSelected ? (
              <SquareMinus className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            <span>
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </span>
          </Button>
          <Badge variant="outline">
            {selectedCount} of {totalCount} selected
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-3">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Records List */}
      <div className="max-h-96 overflow-y-auto border rounded-lg">
        {filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No records found matching your criteria</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className={`p-3 hover:bg-gray-50 ${
                  selectedRecords.includes(record.id) ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={selectedRecords.includes(record.id)}
                    onCheckedChange={(checked) => handleSelectRecord(record.id, checked)}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-sm truncate">
                          {record.client_name}
                        </p>
                        <Badge className={`${getStatusBadgeColor(record.status)} text-xs`}>
                          {record.status?.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="font-semibold text-sm">
                        {formatCurrency(record.amount)}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500 truncate">
                        {record.properties?.name || 'No property'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(record.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
