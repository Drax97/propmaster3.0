import * as XLSX from 'xlsx'

// Try static imports first, fallback to dynamic if needed
let jsPDF = null
let isJsPDFLoaded = false

const loadPDFLibraries = async () => {
  if (typeof window !== 'undefined' && !isJsPDFLoaded) {
    try {
      // Try dynamic import first
      if (!jsPDF) {
        const jsPDFModule = await import('jspdf')
        jsPDF = jsPDFModule.default || jsPDFModule
        await import('jspdf-autotable')
      }
      isJsPDFLoaded = true
    } catch (error) {
      console.error('Failed to load PDF libraries:', error)
      
      // Try accessing global jsPDF if dynamic import fails
      if (typeof window !== 'undefined' && window.jspdf) {
        jsPDF = window.jspdf.jsPDF
        isJsPDFLoaded = true
      } else {
        throw new Error('PDF export libraries are not available. Please try Excel format instead.')
      }
    }
  }
}

/**
 * Export utilities for finance records
 */

export const EXPORT_FORMATS = {
  EXCEL: 'xlsx',
  PDF: 'pdf'
}

export const SORT_OPTIONS = {
  DATE_ASC: { field: 'created_at', direction: 'asc', label: 'Date (Oldest First)' },
  DATE_DESC: { field: 'created_at', direction: 'desc', label: 'Date (Newest First)' },
  AMOUNT_ASC: { field: 'amount', direction: 'asc', label: 'Amount (Low to High)' },
  AMOUNT_DESC: { field: 'amount', direction: 'desc', label: 'Amount (High to Low)' },
  NAME_ASC: { field: 'client_name', direction: 'asc', label: 'Name (A to Z)' },
  NAME_DESC: { field: 'client_name', direction: 'desc', label: 'Name (Z to A)' },
  STATUS_ASC: { field: 'status', direction: 'asc', label: 'Status (A to Z)' },
  STATUS_DESC: { field: 'status', direction: 'desc', label: 'Status (Z to A)' }
}

/**
 * Filter finance records based on criteria
 */
export function filterFinanceRecords(records, filters) {
  return records.filter(record => {
    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      const recordDate = new Date(record.created_at)
      if (filters.dateFrom && recordDate < new Date(filters.dateFrom)) return false
      if (filters.dateTo && recordDate > new Date(filters.dateTo + 'T23:59:59')) return false
    }

    // Person filter (client name)
    if (filters.person && filters.person.trim()) {
      const searchTerm = filters.person.toLowerCase().trim()
      if (!record.client_name?.toLowerCase().includes(searchTerm)) return false
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      if (record.status !== filters.status) return false
    }

    // Payment type filter
    if (filters.paymentType && filters.paymentType !== 'all') {
      if (record.payment_type !== filters.paymentType) return false
    }

    return true
  })
}

/**
 * Sort finance records
 */
export function sortFinanceRecords(records, sortOption) {
  const { field, direction } = SORT_OPTIONS[sortOption] || SORT_OPTIONS.DATE_DESC
  
  return [...records].sort((a, b) => {
    let aValue = a[field]
    let bValue = b[field]

    // Handle different data types
    if (field === 'amount') {
      aValue = parseFloat(aValue) || 0
      bValue = parseFloat(bValue) || 0
    } else if (field === 'created_at') {
      aValue = new Date(aValue)
      bValue = new Date(bValue)
    } else if (typeof aValue === 'string') {
      aValue = aValue?.toLowerCase() || ''
      bValue = bValue?.toLowerCase() || ''
    }

    let comparison = 0
    if (aValue < bValue) comparison = -1
    if (aValue > bValue) comparison = 1

    return direction === 'desc' ? -comparison : comparison
  })
}

/**
 * Format currency for export
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Format date for export
 */
function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

/**
 * Prepare data for export
 */
function prepareExportData(records, includeFields = {}) {
  return records.map(record => ({
    ID: record.id?.slice(0, 8) || '',
    'Client Name': record.client_name || '',
    'Amount': includeFields.showSensitive !== false ? formatCurrency(record.amount) : '[HIDDEN]',
    'Payment Type': record.payment_type || '',
    'Status': record.status?.toUpperCase() || '',
    'Property': record.properties?.name || 'N/A',
    'Created Date': formatDate(record.created_at),
    'Due Date': record.due_date ? formatDate(record.due_date) : '',
    'Next Payment': record.next_payment_date ? formatDate(record.next_payment_date) : '',
    'Notes': includeFields.showSensitive !== false ? (record.notes || '') : '[HIDDEN]'
  }))
}


/**
 * Export to Excel
 */
export function exportToExcel(records, filename = 'finance-records', options = {}) {
  const data = prepareExportData(records, options)
  
  if (data.length === 0) {
    throw new Error('No data to export')
  }

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)

  // Auto-size columns
  const colWidths = Object.keys(data[0]).map(key => ({
    wch: Math.max(
      key.length,
      ...data.map(row => String(row[key] || '').length)
    )
  }))
  ws['!cols'] = colWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Finance Records')

  // Save file
  XLSX.writeFile(wb, `${filename}.xlsx`)
  
  return { success: true, count: data.length }
}


/**
 * Export to PDF
 */
export async function exportToPDF(records, filename = 'finance-records', options = {}) {
  try {
    // Load PDF libraries dynamically
    await loadPDFLibraries()
    
    if (!jsPDF || !isJsPDFLoaded) {
      throw new Error('PDF library not available')
    }

    const data = prepareExportData(records, options)
    
    if (data.length === 0) {
      throw new Error('No data to export')
    }

    // Create PDF with error handling
    let doc
    try {
      doc = new jsPDF('l', 'mm', 'a4') // Landscape orientation
    } catch (e) {
      console.error('jsPDF constructor error:', e)
      throw new Error('Failed to create PDF document')
    }
    
    // Add title
    doc.setFontSize(16)
    doc.text('Finance Records Export', 14, 15)
    
    // Add export info
    doc.setFontSize(10)
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 14, 25)
    doc.text(`Total Records: ${data.length}`, 14, 30)

    // Prepare table data with better error handling
    if (!data[0]) {
      throw new Error('No data structure available for PDF export')
    }

    const headers = Object.keys(data[0])
    const rows = data.map(row => 
      headers.map(header => {
        const value = row[header]
        return value ? String(value).replace(/[\r\n]+/g, ' ').trim() : ''
      })
    )

    // Check if autoTable is available
    if (typeof doc.autoTable !== 'function') {
      // Fallback: create simple text-based PDF
      let yPosition = 45
      doc.setFontSize(8)
      
      // Add headers
      doc.text(headers.join(' | '), 14, yPosition)
      yPosition += 10
      
      // Add data rows
      rows.forEach((row, index) => {
        if (yPosition > 180) { // Start new page
          doc.addPage()
          yPosition = 20
        }
        doc.text(row.join(' | '), 14, yPosition)
        yPosition += 5
      })
    } else {
      // Use autoTable if available
      try {
        doc.autoTable({
          head: [headers],
          body: rows,
          startY: 35,
          styles: { 
            fontSize: 6,
            cellPadding: 1,
            overflow: 'linebreak',
            halign: 'left'
          },
          headStyles: { 
            fillColor: [41, 128, 185],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          alternateRowStyles: { 
            fillColor: [245, 245, 245] 
          },
          margin: { top: 10, right: 10, bottom: 10, left: 10 }
        })
      } catch (tableError) {
        console.error('autoTable error:', tableError)
        // Fallback to simple text layout
        let yPosition = 45
        doc.setFontSize(8)
        doc.text(headers.join(' | '), 14, yPosition)
        yPosition += 10
        
        rows.forEach(row => {
          if (yPosition > 180) {
            doc.addPage()
            yPosition = 20
          }
          doc.text(row.join(' | '), 14, yPosition)
          yPosition += 5
        })
      }
    }

    // Save file
    doc.save(`${filename}.pdf`)
    
    return { success: true, count: data.length }
  } catch (error) {
    console.error('PDF Export Error:', error)
    throw new Error(`PDF export failed: ${error.message}. Please try Excel format instead.`)
  }
}

/**
 * Main export function
 */
export async function exportFinanceRecords(records, format, filename = 'finance-records', options = {}) {
  try {
    switch (format) {
      case EXPORT_FORMATS.EXCEL:
        return exportToExcel(records, filename, options)
      case EXPORT_FORMATS.PDF:
        return await exportToPDF(records, filename, options)
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  } catch (error) {
    console.error('Export error:', error)
    throw error
  }
}

/**
 * Get unique values from records for filter options
 */
export function getFilterOptions(records) {
  const persons = [...new Set(records.map(r => r.client_name).filter(Boolean))].sort()
  const paymentTypes = [...new Set(records.map(r => r.payment_type).filter(Boolean))].sort()
  const statuses = [...new Set(records.map(r => r.status).filter(Boolean))].sort()
  
  return {
    persons,
    paymentTypes,
    statuses
  }
}
