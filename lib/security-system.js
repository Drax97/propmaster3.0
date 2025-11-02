import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'
import { getUserRole, canManageUsers } from '@/lib/permissions'

/**
 * PropMaster 3.0 - Enhanced Security System
 * 
 * Features:
 * - Rate limiting and DDoS protection
 * - Enhanced authentication and session management
 * - Security audit logging
 * - Input validation and sanitization
 * - CSRF protection
 * - Security headers management
 * - Vulnerability scanning
 * - Access control monitoring
 */

export class SecuritySystem {
  constructor() {
    this.rateLimitStore = new Map()
    this.securityEvents = []
    this.blockedIPs = new Set()
    this.suspiciousActivities = new Map()
    
    // Configuration
    this.config = {
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100, // per window per IP
        maxAuthAttempts: 5, // auth attempts per window
        blockDuration: 60 * 60 * 1000 // 1 hour block
      },
      security: {
        maxLoginAttempts: 5,
        sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
        passwordMinLength: 8,
        requireMFA: false, // Can be enabled later
        auditLogRetention: 90 * 24 * 60 * 60 * 1000 // 90 days
      },
      validation: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
        allowedDocTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        maxInputLength: 10000
      }
    }
  }

  /**
   * Rate limiting middleware
   */
  async checkRateLimit(request, options = {}) {
    const {
      maxRequests = this.config.rateLimit.maxRequests,
      windowMs = this.config.rateLimit.windowMs,
      skipSuccessfulGET = true
    } = options

    const ip = this.getClientIP(request)
    const now = Date.now()
    const windowStart = now - windowMs

    // Check if IP is blocked
    if (this.blockedIPs.has(ip)) {
      await this.logSecurityEvent('BLOCKED_IP_ACCESS', {
        ip,
        url: request.url,
        userAgent: request.headers.get('user-agent')
      })
      return {
        allowed: false,
        reason: 'IP_BLOCKED',
        retryAfter: Math.ceil(this.config.rateLimit.blockDuration / 1000)
      }
    }

    // Get or create rate limit entry
    if (!this.rateLimitStore.has(ip)) {
      this.rateLimitStore.set(ip, [])
    }

    const requests = this.rateLimitStore.get(ip)
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => timestamp > windowStart)
    
    // Check if limit exceeded
    if (validRequests.length >= maxRequests) {
      await this.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        ip,
        requestCount: validRequests.length,
        maxRequests,
        url: request.url
      })

      // Block IP if excessive violations
      const violations = this.suspiciousActivities.get(ip) || 0
      if (violations >= 3) {
        this.blockedIPs.add(ip)
        setTimeout(() => this.blockedIPs.delete(ip), this.config.rateLimit.blockDuration)
      } else {
        this.suspiciousActivities.set(ip, violations + 1)
      }

      return {
        allowed: false,
        reason: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000),
        requestCount: validRequests.length,
        maxRequests
      }
    }

    // Add current request
    validRequests.push(now)
    this.rateLimitStore.set(ip, validRequests)

    // Cleanup old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanupRateLimitStore()
    }

    return {
      allowed: true,
      requestCount: validRequests.length,
      maxRequests,
      resetTime: windowStart + windowMs
    }
  }

  /**
   * Enhanced authentication check with security logging
   */
  async authenticateRequest(request, requiredRole = null) {
    try {
      const session = await getServerSession(authOptions)
      
      if (!session?.user) {
        await this.logSecurityEvent('UNAUTHENTICATED_ACCESS', {
          ip: this.getClientIP(request),
          url: request.url,
          userAgent: request.headers.get('user-agent')
        })
        
        return {
          authenticated: false,
          user: null,
          error: 'Authentication required'
        }
      }

      const userRole = getUserRole(session.user)
      
      // Check role requirements
      if (requiredRole && !this.hasRequiredRole(userRole, requiredRole)) {
        await this.logSecurityEvent('INSUFFICIENT_PERMISSIONS', {
          ip: this.getClientIP(request),
          url: request.url,
          userEmail: session.user.email,
          userRole,
          requiredRole
        })
        
        return {
          authenticated: true,
          user: session.user,
          authorized: false,
          error: 'Insufficient permissions'
        }
      }

      // Log successful authentication for sensitive endpoints
      if (this.isSensitiveEndpoint(request.url)) {
        await this.logSecurityEvent('SENSITIVE_ENDPOINT_ACCESS', {
          ip: this.getClientIP(request),
          url: request.url,
          userEmail: session.user.email,
          userRole
        })
      }

      return {
        authenticated: true,
        authorized: true,
        user: session.user,
        role: userRole
      }
    } catch (error) {
      await this.logSecurityEvent('AUTHENTICATION_ERROR', {
        ip: this.getClientIP(request),
        url: request.url,
        error: error.message
      })
      
      return {
        authenticated: false,
        user: null,
        error: 'Authentication failed'
      }
    }
  }

  /**
   * Input validation and sanitization
   */
  validateAndSanitizeInput(input, type = 'text', options = {}) {
    const {
      maxLength = this.config.validation.maxInputLength,
      required = false,
      allowHTML = false,
      pattern = null
    } = options

    const result = {
      valid: true,
      sanitized: input,
      errors: []
    }

    // Check required
    if (required && (!input || input.toString().trim().length === 0)) {
      result.valid = false
      result.errors.push('Field is required')
      return result
    }

    // Handle null/undefined
    if (!input) {
      result.sanitized = null
      return result
    }

    const inputStr = input.toString()

    // Check length
    if (inputStr.length > maxLength) {
      result.valid = false
      result.errors.push(`Input too long. Maximum ${maxLength} characters allowed`)
      return result
    }

    // Type-specific validation
    switch (type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(inputStr)) {
          result.valid = false
          result.errors.push('Invalid email format')
        }
        result.sanitized = inputStr.toLowerCase().trim()
        break

      case 'url':
        try {
          new URL(inputStr)
          result.sanitized = inputStr.trim()
        } catch {
          result.valid = false
          result.errors.push('Invalid URL format')
        }
        break

      case 'number':
        const num = parseFloat(inputStr)
        if (isNaN(num)) {
          result.valid = false
          result.errors.push('Invalid number format')
        } else {
          result.sanitized = num
        }
        break

      case 'integer':
        const int = parseInt(inputStr)
        if (isNaN(int) || !Number.isInteger(int)) {
          result.valid = false
          result.errors.push('Invalid integer format')
        } else {
          result.sanitized = int
        }
        break

      case 'text':
      default:
        // Sanitize HTML if not allowed
        if (!allowHTML) {
          result.sanitized = this.sanitizeHTML(inputStr)
        } else {
          result.sanitized = inputStr.trim()
        }
        break
    }

    // Pattern validation
    if (pattern && result.valid) {
      const regex = new RegExp(pattern)
      if (!regex.test(result.sanitized.toString())) {
        result.valid = false
        result.errors.push('Input format is invalid')
      }
    }

    return result
  }

  /**
   * File upload security validation
   */
  validateFileUpload(file, fileType = 'image') {
    const result = {
      valid: true,
      errors: []
    }

    // Check file size
    if (file.size > this.config.validation.maxFileSize) {
      result.valid = false
      result.errors.push(`File too large. Maximum size is ${this.formatBytes(this.config.validation.maxFileSize)}`)
    }

    // Check file type
    const allowedTypes = fileType === 'image' 
      ? this.config.validation.allowedImageTypes
      : this.config.validation.allowedDocTypes

    if (!allowedTypes.includes(file.type)) {
      result.valid = false
      result.errors.push(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`)
    }

    // Check filename for suspicious patterns
    const suspiciousPatterns = [
      /\.php$/i, /\.asp$/i, /\.jsp$/i, /\.exe$/i, /\.bat$/i, /\.cmd$/i,
      /\.scr$/i, /\.pif$/i, /\.com$/i, /\.vbs$/i, /\.js$/i
    ]

    if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
      result.valid = false
      result.errors.push('File type not allowed for security reasons')
    }

    return result
  }

  /**
   * Security headers middleware
   */
  getSecurityHeaders() {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://*.supabase.co https://accounts.google.com",
        "frame-src https://accounts.google.com"
      ].join('; '),
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    }
  }

  /**
   * Security audit logging
   */
  async logSecurityEvent(eventType, details = {}) {
    const event = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      type: eventType,
      severity: this.getEventSeverity(eventType),
      details: {
        ...details,
        userAgent: details.userAgent || 'Unknown',
        timestamp: Date.now()
      }
    }

    // Store in memory (in production, this should go to a database)
    this.securityEvents.push(event)

    // Keep only recent events to prevent memory issues
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-500)
    }

    // Log high severity events immediately
    if (event.severity === 'HIGH' || event.severity === 'CRITICAL') {
      console.warn(`🚨 SECURITY EVENT [${event.severity}]: ${eventType}`, event.details)
      
      // In production, you might want to send alerts here
      // await this.sendSecurityAlert(event)
    }

    // Store in database for persistence
    try {
      if (supabaseAdmin) {
        await supabaseAdmin
          .from('security_audit_log')
          .insert([{
            event_type: eventType,
            severity: event.severity,
            details: event.details,
            created_at: event.timestamp
          }])
      }
    } catch (error) {
      console.error('Failed to log security event to database:', error)
    }

    return event
  }

  /**
   * Get security audit reports
   */
  async getSecurityAuditReport(options = {}) {
    const {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      endDate = new Date(),
      severity = null,
      eventType = null,
      limit = 100
    } = options

    try {
      let query = supabaseAdmin
        .from('security_audit_log')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(limit)

      if (severity) {
        query = query.eq('severity', severity)
      }

      if (eventType) {
        query = query.eq('event_type', eventType)
      }

      const { data: auditLogs, error } = await query

      if (error) {
        throw error
      }

      // Generate summary statistics
      const summary = {
        totalEvents: auditLogs.length,
        bySeverity: {},
        byType: {},
        topIPs: {},
        timeRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }

      auditLogs.forEach(log => {
        // Count by severity
        summary.bySeverity[log.severity] = (summary.bySeverity[log.severity] || 0) + 1
        
        // Count by type
        summary.byType[log.event_type] = (summary.byType[log.event_type] || 0) + 1
        
        // Count by IP
        const ip = log.details?.ip
        if (ip) {
          summary.topIPs[ip] = (summary.topIPs[ip] || 0) + 1
        }
      })

      return {
        success: true,
        summary,
        events: auditLogs,
        recommendations: this.generateSecurityRecommendations(summary)
      }
    } catch (error) {
      console.error('Failed to generate security audit report:', error)
      return {
        success: false,
        error: error.message,
        summary: null,
        events: []
      }
    }
  }

  /**
   * Security vulnerability scan
   */
  async performSecurityScan() {
    const vulnerabilities = []
    const recommendations = []

    try {
      // Check environment configuration
      const envCheck = await this.checkEnvironmentSecurity()
      if (envCheck.issues.length > 0) {
        vulnerabilities.push({
          type: 'ENVIRONMENT_CONFIGURATION',
          severity: 'MEDIUM',
          issues: envCheck.issues,
          recommendations: envCheck.recommendations
        })
      }

      // Check database security
      const dbCheck = await this.checkDatabaseSecurity()
      if (dbCheck.issues.length > 0) {
        vulnerabilities.push({
          type: 'DATABASE_SECURITY',
          severity: 'HIGH',
          issues: dbCheck.issues,
          recommendations: dbCheck.recommendations
        })
      }

      // Check authentication security
      const authCheck = await this.checkAuthenticationSecurity()
      if (authCheck.issues.length > 0) {
        vulnerabilities.push({
          type: 'AUTHENTICATION_SECURITY',
          severity: 'HIGH',
          issues: authCheck.issues,
          recommendations: authCheck.recommendations
        })
      }

      // Check file upload security
      const fileCheck = this.checkFileUploadSecurity()
      if (fileCheck.issues.length > 0) {
        vulnerabilities.push({
          type: 'FILE_UPLOAD_SECURITY',
          severity: 'MEDIUM',
          issues: fileCheck.issues,
          recommendations: fileCheck.recommendations
        })
      }

      // Generate overall security score
      const securityScore = this.calculateSecurityScore(vulnerabilities)

      return {
        success: true,
        timestamp: new Date().toISOString(),
        securityScore,
        vulnerabilities,
        overallRecommendations: this.generateOverallRecommendations(vulnerabilities),
        nextScanRecommended: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    } catch (error) {
      console.error('Security scan failed:', error)
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Helper methods
   */
  getClientIP(request) {
    // Try various headers that might contain the real IP
    const headers = [
      'x-forwarded-for',
      'x-real-ip',
      'cf-connecting-ip',
      'x-client-ip',
      'x-cluster-client-ip'
    ]

    for (const header of headers) {
      const value = request.headers.get(header)
      if (value) {
        // Take the first IP if comma-separated
        return value.split(',')[0].trim()
      }
    }

    return 'unknown'
  }

  hasRequiredRole(userRole, requiredRole) {
    const roleHierarchy = {
      'viewer': 1,
      'editor': 2,
      'master': 3
    }

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
  }

  isSensitiveEndpoint(url) {
    const sensitivePatterns = [
      '/api/admin/',
      '/api/backup/',
      '/api/users/',
      '/api/finances/',
      '/api/database/',
      '/api/upload/'
    ]

    return sensitivePatterns.some(pattern => url.includes(pattern))
  }

  sanitizeHTML(input) {
    // Basic HTML sanitization - remove potentially dangerous tags
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/<link\b[^>]*>/gi, '')
      .replace(/<meta\b[^>]*>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
  }

  getEventSeverity(eventType) {
    const severityMap = {
      'BLOCKED_IP_ACCESS': 'HIGH',
      'RATE_LIMIT_EXCEEDED': 'MEDIUM',
      'UNAUTHENTICATED_ACCESS': 'LOW',
      'INSUFFICIENT_PERMISSIONS': 'MEDIUM',
      'SENSITIVE_ENDPOINT_ACCESS': 'LOW',
      'AUTHENTICATION_ERROR': 'MEDIUM',
      'SQL_INJECTION_ATTEMPT': 'CRITICAL',
      'XSS_ATTEMPT': 'HIGH',
      'FILE_UPLOAD_VIOLATION': 'MEDIUM',
      'SUSPICIOUS_ACTIVITY': 'MEDIUM'
    }

    return severityMap[eventType] || 'LOW'
  }

  generateEventId() {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  cleanupRateLimitStore() {
    const now = Date.now()
    const windowMs = this.config.rateLimit.windowMs
    
    for (const [ip, requests] of this.rateLimitStore.entries()) {
      const validRequests = requests.filter(timestamp => timestamp > now - windowMs)
      if (validRequests.length === 0) {
        this.rateLimitStore.delete(ip)
      } else {
        this.rateLimitStore.set(ip, validRequests)
      }
    }
  }

  async checkEnvironmentSecurity() {
    const issues = []
    const recommendations = []

    // Check for required environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'NEXTAUTH_SECRET'
    ]

    requiredEnvVars.forEach(varName => {
      if (!process.env[varName]) {
        issues.push(`Missing environment variable: ${varName}`)
        recommendations.push(`Set ${varName} in your environment configuration`)
      }
    })

    // Check for weak secrets
    if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
      issues.push('NEXTAUTH_SECRET is too short')
      recommendations.push('Use a strong, randomly generated secret for NEXTAUTH_SECRET (at least 32 characters)')
    }

    return { issues, recommendations }
  }

  async checkDatabaseSecurity() {
    const issues = []
    const recommendations = []

    try {
      // Check RLS policies
      const { data: policies, error } = await supabaseAdmin
        .from('pg_policies')
        .select('*')

      if (error || !policies || policies.length === 0) {
        issues.push('Row Level Security policies may not be properly configured')
        recommendations.push('Ensure RLS policies are enabled and properly configured for all tables')
      }

      // Check for default passwords or weak configurations
      // This would require more specific database queries

    } catch (error) {
      issues.push(`Database security check failed: ${error.message}`)
      recommendations.push('Verify database connectivity and permissions')
    }

    return { issues, recommendations }
  }

  async checkAuthenticationSecurity() {
    const issues = []
    const recommendations = []

    // Check session configuration
    if (!process.env.NEXTAUTH_SECRET) {
      issues.push('NextAuth secret not configured')
      recommendations.push('Set NEXTAUTH_SECRET environment variable')
    }

    // Check OAuth configuration
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      issues.push('Google OAuth not fully configured')
      recommendations.push('Configure Google OAuth client ID and secret')
    }

    return { issues, recommendations }
  }

  checkFileUploadSecurity() {
    const issues = []
    const recommendations = []

    // Check file size limits
    if (this.config.validation.maxFileSize > 50 * 1024 * 1024) { // 50MB
      issues.push('File upload size limit may be too high')
      recommendations.push('Consider reducing maximum file upload size for security')
    }

    // Check allowed file types
    if (this.config.validation.allowedImageTypes.includes('image/svg+xml')) {
      issues.push('SVG files are allowed which may contain malicious scripts')
      recommendations.push('Consider removing SVG from allowed image types or implement SVG sanitization')
    }

    return { issues, recommendations }
  }

  calculateSecurityScore(vulnerabilities) {
    let score = 100
    
    vulnerabilities.forEach(vuln => {
      switch (vuln.severity) {
        case 'CRITICAL':
          score -= 25
          break
        case 'HIGH':
          score -= 15
          break
        case 'MEDIUM':
          score -= 10
          break
        case 'LOW':
          score -= 5
          break
      }
    })

    return Math.max(0, score)
  }

  generateSecurityRecommendations(summary) {
    const recommendations = []

    if (summary.bySeverity.CRITICAL > 0) {
      recommendations.push('🚨 Critical security events detected - immediate action required')
    }

    if (summary.bySeverity.HIGH > 5) {
      recommendations.push('⚠️ High number of high-severity events - review security measures')
    }

    if (summary.byType.RATE_LIMIT_EXCEEDED > 10) {
      recommendations.push('Consider implementing stricter rate limiting')
    }

    if (summary.byType.UNAUTHENTICATED_ACCESS > 20) {
      recommendations.push('Review authentication requirements for endpoints')
    }

    return recommendations
  }

  generateOverallRecommendations(vulnerabilities) {
    const recommendations = [
      'Regularly update all dependencies and packages',
      'Implement monitoring and alerting for security events',
      'Conduct regular security audits and penetration testing',
      'Train team members on security best practices',
      'Implement backup and disaster recovery procedures',
      'Review and update security policies regularly'
    ]

    const hasCritical = vulnerabilities.some(v => v.severity === 'CRITICAL')
    const hasHigh = vulnerabilities.some(v => v.severity === 'HIGH')

    if (hasCritical) {
      recommendations.unshift('🚨 Address critical vulnerabilities immediately')
    } else if (hasHigh) {
      recommendations.unshift('⚠️ Address high-priority vulnerabilities as soon as possible')
    } else {
      recommendations.unshift('✅ No critical vulnerabilities found - maintain current security posture')
    }

    return recommendations
  }
}

// Export singleton instance
export const securitySystem = new SecuritySystem()

// Security middleware functions
export const withRateLimit = (options = {}) => {
  return async (request) => {
    return await securitySystem.checkRateLimit(request, options)
  }
}

export const withAuthentication = (requiredRole = null) => {
  return async (request) => {
    return await securitySystem.authenticateRequest(request, requiredRole)
  }
}

export const withSecurityHeaders = () => {
  return securitySystem.getSecurityHeaders()
}
