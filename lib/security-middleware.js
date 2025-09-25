import { NextResponse } from 'next/server'
import { securitySystem, withRateLimit, withAuthentication, withSecurityHeaders } from '@/lib/security-system'

/**
 * PropMaster 3.0 - Security Middleware
 * 
 * Provides reusable security middleware functions that can be applied to API routes
 * to enhance security without modifying existing route logic.
 */

/**
 * Enhanced API route wrapper with comprehensive security
 * 
 * @param {Function} handler - The original API route handler
 * @param {Object} options - Security options
 * @returns {Function} - Enhanced handler with security middleware
 */
export function withSecurity(handler, options = {}) {
  const {
    requireAuth = true,
    requiredRole = null,
    rateLimit = true,
    rateLimitOptions = {},
    validateInput = true,
    logAccess = false,
    sensitiveEndpoint = false
  } = options

  return async (request, context) => {
    try {
      // Apply security headers
      const securityHeaders = withSecurityHeaders()
      
      // Apply rate limiting if enabled
      if (rateLimit) {
        const rateLimitResult = await withRateLimit(rateLimitOptions)(request)
        
        if (!rateLimitResult.allowed) {
          const response = NextResponse.json({
            error: 'Rate limit exceeded',
            retryAfter: rateLimitResult.retryAfter,
            reason: rateLimitResult.reason
          }, { 
            status: 429,
            headers: {
              'Retry-After': rateLimitResult.retryAfter.toString(),
              ...securityHeaders
            }
          })
          
          return response
        }
      }

      // Apply authentication if required
      let authResult = null
      if (requireAuth) {
        authResult = await withAuthentication(requiredRole)(request)
        
        if (!authResult.authenticated) {
          const response = NextResponse.json({
            error: authResult.error || 'Authentication required'
          }, { 
            status: 401,
            headers: securityHeaders
          })
          
          return response
        }

        if (!authResult.authorized) {
          const response = NextResponse.json({
            error: authResult.error || 'Insufficient permissions'
          }, { 
            status: 403,
            headers: securityHeaders
          })
          
          return response
        }
      }

      // Input validation for POST/PUT requests
      if (validateInput && (request.method === 'POST' || request.method === 'PUT')) {
        const inputValidation = await validateRequestInput(request)
        
        if (!inputValidation.valid) {
          await securitySystem.logSecurityEvent('INPUT_VALIDATION_FAILED', {
            ip: securitySystem.getClientIP(request),
            url: request.url,
            method: request.method,
            errors: inputValidation.errors,
            userEmail: authResult?.user?.email
          })

          const response = NextResponse.json({
            error: 'Input validation failed',
            details: inputValidation.errors
          }, { 
            status: 400,
            headers: securityHeaders
          })
          
          return response
        }
      }

      // Log access for sensitive endpoints
      if (logAccess || sensitiveEndpoint) {
        await securitySystem.logSecurityEvent('API_ACCESS', {
          ip: securitySystem.getClientIP(request),
          url: request.url,
          method: request.method,
          userEmail: authResult?.user?.email,
          userRole: authResult?.role,
          sensitive: sensitiveEndpoint
        })
      }

      // Call the original handler
      const response = await handler(request, context)
      
      // Add security headers to the response
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })

      return response

    } catch (error) {
      // Log security-related errors
      await securitySystem.logSecurityEvent('API_ERROR', {
        ip: securitySystem.getClientIP(request),
        url: request.url,
        method: request.method,
        error: error.message,
        stack: error.stack
      })

      console.error('Security middleware error:', error)
      
      const response = NextResponse.json({
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      }, { 
        status: 500,
        headers: withSecurityHeaders()
      })
      
      return response
    }
  }
}

/**
 * Specific middleware for different security levels
 */

// Public endpoints (no auth required, basic rate limiting)
export function withPublicSecurity(handler, options = {}) {
  return withSecurity(handler, {
    requireAuth: false,
    rateLimit: true,
    rateLimitOptions: { maxRequests: 60, windowMs: 60000 }, // 60 requests per minute
    validateInput: true,
    logAccess: false,
    ...options
  })
}

// Authenticated endpoints (auth required, standard rate limiting)
export function withAuthenticatedSecurity(handler, options = {}) {
  return withSecurity(handler, {
    requireAuth: true,
    rateLimit: true,
    rateLimitOptions: { maxRequests: 120, windowMs: 60000 }, // 120 requests per minute
    validateInput: true,
    logAccess: false,
    ...options
  })
}

// Admin endpoints (master role required, stricter monitoring)
export function withAdminSecurity(handler, options = {}) {
  return withSecurity(handler, {
    requireAuth: true,
    requiredRole: 'master',
    rateLimit: true,
    rateLimitOptions: { maxRequests: 60, windowMs: 60000 }, // 60 requests per minute
    validateInput: true,
    logAccess: true,
    sensitiveEndpoint: true,
    ...options
  })
}

// File upload endpoints (special validation for files)
export function withFileUploadSecurity(handler, options = {}) {
  return withSecurity(handler, {
    requireAuth: true,
    requiredRole: 'editor', // Minimum editor role for file uploads
    rateLimit: true,
    rateLimitOptions: { maxRequests: 30, windowMs: 60000 }, // 30 uploads per minute
    validateInput: false, // Special file validation handled separately
    logAccess: true,
    ...options
  })
}

/**
 * Input validation helper
 */
async function validateRequestInput(request) {
  const errors = []
  
  try {
    const contentType = request.headers.get('content-type') || ''
    
    if (contentType.includes('application/json')) {
      // Validate JSON input
      const body = await request.text()
      
      // Check for excessively large payloads
      if (body.length > 1024 * 1024) { // 1MB limit
        errors.push('Request payload too large')
      }
      
      // Parse and validate JSON
      try {
        const jsonData = JSON.parse(body)
        
        // Check for suspicious patterns
        const jsonString = JSON.stringify(jsonData)
        
        // Check for potential SQL injection patterns
        const sqlPatterns = [
          /union\s+select/i,
          /drop\s+table/i,
          /delete\s+from/i,
          /insert\s+into/i,
          /update\s+set/i,
          /exec\s*\(/i,
          /script\s*>/i
        ]
        
        sqlPatterns.forEach(pattern => {
          if (pattern.test(jsonString)) {
            errors.push('Potentially malicious input detected')
          }
        })
        
        // Check for XSS patterns
        const xssPatterns = [
          /<script/i,
          /javascript:/i,
          /on\w+\s*=/i,
          /<iframe/i,
          /<object/i,
          /<embed/i
        ]
        
        xssPatterns.forEach(pattern => {
          if (pattern.test(jsonString)) {
            errors.push('Potentially malicious script content detected')
          }
        })
        
        // Validate individual fields if it's an object
        if (typeof jsonData === 'object' && jsonData !== null) {
          validateObjectFields(jsonData, errors)
        }
        
      } catch (parseError) {
        errors.push('Invalid JSON format')
      }
    }
    
  } catch (error) {
    errors.push('Failed to validate request input')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate object fields for common security issues
 */
function validateObjectFields(obj, errors, path = '') {
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key
    
    if (typeof value === 'string') {
      // Check string length
      if (value.length > 10000) {
        errors.push(`Field ${currentPath} is too long`)
      }
      
      // Check for null bytes
      if (value.includes('\0')) {
        errors.push(`Field ${currentPath} contains null bytes`)
      }
      
      // Check for path traversal attempts
      if (value.includes('../') || value.includes('..\\')) {
        errors.push(`Field ${currentPath} contains path traversal attempt`)
      }
      
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively validate nested objects
      validateObjectFields(value, errors, currentPath)
      
    } else if (Array.isArray(value)) {
      // Validate array items
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          validateObjectFields(item, errors, `${currentPath}[${index}]`)
        }
      })
    }
  }
}

/**
 * File upload validation
 */
export async function validateFileUpload(file, fileType = 'image') {
  const validation = securitySystem.validateFileUpload(file, fileType)
  
  if (!validation.valid) {
    await securitySystem.logSecurityEvent('FILE_UPLOAD_VIOLATION', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      errors: validation.errors
    })
  }
  
  return validation
}

/**
 * CORS middleware for API routes
 */
export function withCORS(handler, options = {}) {
  const {
    origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization']
  } = options

  return async (request, context) => {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': methods.join(', '),
          'Access-Control-Allow-Headers': allowedHeaders.join(', '),
          'Access-Control-Max-Age': '86400', // 24 hours
          ...withSecurityHeaders()
        }
      })
    }

    // Call the handler
    const response = await handler(request, context)

    // Add CORS headers to the response
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', methods.join(', '))
    response.headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '))

    return response
  }
}

/**
 * Request logging middleware
 */
export function withRequestLogging(handler, options = {}) {
  const { logLevel = 'info' } = options

  return async (request, context) => {
    const startTime = Date.now()
    const ip = securitySystem.getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'Unknown'

    console.log(`[${logLevel.toUpperCase()}] ${request.method} ${request.url} - IP: ${ip}`)

    try {
      const response = await handler(request, context)
      const duration = Date.now() - startTime

      console.log(`[${logLevel.toUpperCase()}] ${request.method} ${request.url} - ${response.status} (${duration}ms)`)

      return response
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[ERROR] ${request.method} ${request.url} - Error: ${error.message} (${duration}ms)`)
      throw error
    }
  }
}

/**
 * Combine multiple middleware functions
 */
export function combineMiddleware(...middlewares) {
  return (handler) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler)
  }
}

// Example usage patterns:
// export const GET = withAuthenticatedSecurity(async (request) => { ... })
// export const POST = withAdminSecurity(async (request) => { ... })
// export const PUT = combineMiddleware(withRequestLogging, withAuthenticatedSecurity)(async (request) => { ... })
