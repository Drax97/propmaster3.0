import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getUserRole, canAccessArchive } from '@/lib/permissions'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { getUserByEmail } from '@/lib/database/optimized-queries'

export async function POST(request) {
  try {
    console.log('🔄 Bulk properties operation requested')

    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user info
    const userResult = await getUserByEmail(session.user.email)
    if (userResult.error || !userResult.data) {
      return NextResponse.json({ error: 'Could not find user' }, { status: 403 })
    }

    const userId = userResult.data.id
    const userRole = getUserRole(session.user)

    // Permission check - bulk operations are master-only
    if (!canAccessArchive(userRole)) {
      return NextResponse.json({ 
        error: 'Bulk operations are restricted to master users only' 
      }, { status: 403 })
    }

    const body = await request.json()
    const { 
      action, 
      propertyIds = [], 
      newStatus = null,
      archiveReason = null,
      filters = {} 
    } = body

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
      return NextResponse.json({ 
        error: 'Property IDs array is required and cannot be empty' 
      }, { status: 400 })
    }

    console.log(`Performing bulk ${action} on ${propertyIds.length} properties`)

    const client = supabaseAdmin || supabase
    const results = {
      action,
      totalRequested: propertyIds.length,
      successful: 0,
      failed: 0,
      errors: [],
      processedProperties: []
    }

    // Validate user has permission to modify these properties
    const { data: propertiesToModify, error: fetchError } = await client
      .from('properties')
      .select('id, name, status, created_by')
      .in('id', propertyIds)

    if (fetchError) {
      return NextResponse.json({ 
        error: 'Failed to fetch properties for validation',
        details: fetchError.message 
      }, { status: 500 })
    }

    // Check permissions for each property
    const allowedProperties = propertiesToModify.filter(property => {
      // Master can modify all properties
      if (userRole === 'master') return true
      
      // Editors can only modify their own properties
      if (userRole === 'editor') {
        return property.created_by === userId
      }
      
      return false
    })

    if (allowedProperties.length === 0) {
      return NextResponse.json({ 
        error: 'No properties found that you have permission to modify' 
      }, { status: 403 })
    }

    const allowedPropertyIds = allowedProperties.map(p => p.id)

    // Process each action type
    switch (action) {
      case 'archive':
        await processBulkArchive(client, allowedPropertyIds, archiveReason, results)
        break
        
      case 'unarchive':
        await processBulkUnarchive(client, allowedPropertyIds, results)
        break
        
      case 'delete':
        // Only masters can delete
        if (userRole !== 'master') {
          return NextResponse.json({ 
            error: 'Only master users can delete properties' 
          }, { status: 403 })
        }
        await processBulkDelete(client, allowedPropertyIds, results)
        break
        
      case 'updateStatus':
        if (!newStatus) {
          return NextResponse.json({ 
            error: 'newStatus is required for updateStatus action' 
          }, { status: 400 })
        }
        await processBulkStatusUpdate(client, allowedPropertyIds, newStatus, results)
        break
        
      case 'duplicate':
        await processBulkDuplicate(client, allowedPropertyIds, userId, results)
        break
        
      default:
        return NextResponse.json({ 
          error: `Unknown action: ${action}` 
        }, { status: 400 })
    }

    console.log(`Bulk ${action} completed: ${results.successful}/${results.totalRequested} successful`)

    return NextResponse.json({
      ...results,
      message: `Bulk ${action} completed: ${results.successful}/${results.totalRequested} successful`
    }, { status: results.failed > 0 ? 206 : 200 })

  } catch (error) {
    console.error('Bulk properties operation error:', error)
    return NextResponse.json({
      error: 'Internal server error during bulk operation',
      details: error.message
    }, { status: 500 })
  }
}

async function processBulkArchive(client, propertyIds, reason, results) {
  console.log(`📦 Archiving ${propertyIds.length} properties`)
  
  for (const propertyId of propertyIds) {
    try {
      const { data, error } = await client
        .from('properties')
        .update({
          status: 'archived',
          archived_at: new Date().toISOString(),
          archive_reason: reason || 'Bulk archive operation',
          updated_at: new Date().toISOString()
        })
        .eq('id', propertyId)
        .select('id, name, status')
        .single()

      if (error) {
        results.failed++
        results.errors.push({
          propertyId,
          error: error.message
        })
      } else {
        results.successful++
        results.processedProperties.push({
          id: data.id,
          name: data.name,
          newStatus: data.status,
          action: 'archived'
        })
      }
    } catch (err) {
      results.failed++
      results.errors.push({
        propertyId,
        error: err.message
      })
    }
  }
}

async function processBulkUnarchive(client, propertyIds, results) {
  console.log(`📤 Unarchiving ${propertyIds.length} properties`)
  
  for (const propertyId of propertyIds) {
    try {
      const { data, error } = await client
        .from('properties')
        .update({
          status: 'available', // Default status when unarchiving
          archived_at: null,
          archive_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', propertyId)
        .select('id, name, status')
        .single()

      if (error) {
        results.failed++
        results.errors.push({
          propertyId,
          error: error.message
        })
      } else {
        results.successful++
        results.processedProperties.push({
          id: data.id,
          name: data.name,
          newStatus: data.status,
          action: 'unarchived'
        })
      }
    } catch (err) {
      results.failed++
      results.errors.push({
        propertyId,
        error: err.message
      })
    }
  }
}

async function processBulkDelete(client, propertyIds, results) {
  console.log(`🗑️ Deleting ${propertyIds.length} properties`)
  
  for (const propertyId of propertyIds) {
    try {
      // First get property name for logging
      const { data: propertyData } = await client
        .from('properties')
        .select('name')
        .eq('id', propertyId)
        .single()

      // Delete the property (this will cascade to related finance records due to FK constraints)
      const { error } = await client
        .from('properties')
        .delete()
        .eq('id', propertyId)

      if (error) {
        results.failed++
        results.errors.push({
          propertyId,
          error: error.message
        })
      } else {
        results.successful++
        results.processedProperties.push({
          id: propertyId,
          name: propertyData?.name || 'Unknown Property',
          action: 'deleted'
        })
      }
    } catch (err) {
      results.failed++
      results.errors.push({
        propertyId,
        error: err.message
      })
    }
  }
}

async function processBulkStatusUpdate(client, propertyIds, newStatus, results) {
  console.log(`🔄 Updating status to "${newStatus}" for ${propertyIds.length} properties`)
  
  const validStatuses = ['available', 'occupied', 'maintenance', 'sold', 'pending', 'private']
  if (!validStatuses.includes(newStatus)) {
    results.failed = propertyIds.length
    results.errors.push({
      error: `Invalid status: ${newStatus}. Valid options: ${validStatuses.join(', ')}`
    })
    return
  }
  
  for (const propertyId of propertyIds) {
    try {
      const { data, error } = await client
        .from('properties')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', propertyId)
        .select('id, name, status')
        .single()

      if (error) {
        results.failed++
        results.errors.push({
          propertyId,
          error: error.message
        })
      } else {
        results.successful++
        results.processedProperties.push({
          id: data.id,
          name: data.name,
          newStatus: data.status,
          action: 'status_updated'
        })
      }
    } catch (err) {
      results.failed++
      results.errors.push({
        propertyId,
        error: err.message
      })
    }
  }
}

async function processBulkDuplicate(client, propertyIds, userId, results) {
  console.log(`📋 Duplicating ${propertyIds.length} properties`)
  
  for (const propertyId of propertyIds) {
    try {
      // Get the original property
      const { data: originalProperty, error: fetchError } = await client
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single()

      if (fetchError) {
        results.failed++
        results.errors.push({
          propertyId,
          error: `Failed to fetch original property: ${fetchError.message}`
        })
        continue
      }

      // Create duplicate with modified fields
      const duplicateData = {
        ...originalProperty,
        id: undefined, // Let database generate new ID
        name: `${originalProperty.name} (Copy)`,
        status: 'pending', // Default status for duplicates
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Reset archive fields
        archived_at: null,
        archive_reason: null
      }

      const { data: newProperty, error: createError } = await client
        .from('properties')
        .insert([duplicateData])
        .select('id, name, status')
        .single()

      if (createError) {
        results.failed++
        results.errors.push({
          propertyId,
          error: `Failed to create duplicate: ${createError.message}`
        })
      } else {
        results.successful++
        results.processedProperties.push({
          id: newProperty.id,
          name: newProperty.name,
          originalId: propertyId,
          action: 'duplicated'
        })
      }
    } catch (err) {
      results.failed++
      results.errors.push({
        propertyId,
        error: err.message
      })
    }
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Bulk properties operations API',
    supportedActions: [
      'archive',
      'unarchive', 
      'delete',
      'updateStatus',
      'duplicate'
    ],
    documentation: {
      archive: 'Archives properties by setting status to "archived"',
      unarchive: 'Unarchives properties by setting status to "available"',
      delete: 'Permanently deletes properties (Master only)',
      updateStatus: 'Updates property status (requires newStatus parameter)',
      duplicate: 'Creates copies of properties with modified names'
    }
  })
}
