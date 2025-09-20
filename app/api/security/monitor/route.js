import { NextResponse } from 'next/server'
import { securitySystem, withAuthentication, withRateLimit } from '@/lib/security-system'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

/**
 * Security Monitoring API
 * 
 * GET /api/security/monitor - Get real-time security monitoring data
 * POST /api/security/monitor - Update security configuration
 */

export async function GET(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await withRateLimit({ maxRequests: 30, windowMs: 60000 })(request)
    if (!rateLimitResult.allowed) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter
      }, { 
        status: 429,
        headers: {
          'Retry-After': rateLimitResult.retryAfter.toString()
        }
      })
    }

    // Check authentication
    const authResult = await withAuthentication('master')(request)
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }

    if (!authResult.authorized) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only master users can access security monitoring.' },
        { status: 403 }
      )
    }

    console.log(`📊 Security monitoring requested by: ${authResult.user.email}`)

    // Get real-time security data
    const monitoringData = {
      timestamp: new Date().toISOString(),
      system_status: {
        rate_limiting: {
          active_limits: securitySystem.rateLimitStore.size,
          blocked_ips: Array.from(securitySystem.blockedIPs),
          blocked_ips_count: securitySystem.blockedIPs.size,
          suspicious_activities: securitySystem.suspiciousActivities.size
        },
        security_events: {
          total_events: securitySystem.securityEvents.length,
          recent_events: securitySystem.securityEvents.slice(-10),
          events_by_severity: securitySystem.securityEvents.reduce((acc, event) => {
            acc[event.severity] = (acc[event.severity] || 0) + 1
            return acc
          }, {}),
          events_by_type: securitySystem.securityEvents.reduce((acc, event) => {
            acc[event.type] = (acc[event.type] || 0) + 1
            return acc
          }, {})
        },
        configuration: {
          rate_limit: securitySystem.config.rateLimit,
          security: securitySystem.config.security,
          validation: securitySystem.config.validation
        }
      },
      alerts: generateSecurityAlerts(),
      recommendations: generateRealTimeRecommendations()
    }

    return NextResponse.json({
      success: true,
      monitoring_data: monitoringData,
      rate_limit_info: {
        requests_remaining: rateLimitResult.maxRequests - rateLimitResult.requestCount,
        reset_time: new Date(rateLimitResult.resetTime).toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Security monitoring failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Security monitoring failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    // Check authentication
    const authResult = await withAuthentication('master')(request)
    if (!authResult.authenticated || !authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Insufficient permissions' },
        { status: authResult.authenticated ? 403 : 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { action, configuration } = body

    console.log(`🔧 Security configuration update requested by: ${authResult.user.email}`)
    console.log(`🎯 Action: ${action}`)

    let result = {}

    switch (action) {
      case 'update_config':
        if (configuration) {
          // Validate and update configuration
          const validationResult = validateSecurityConfiguration(configuration)
          if (!validationResult.valid) {
            return NextResponse.json({
              success: false,
              error: 'Invalid configuration',
              details: validationResult.errors
            }, { status: 400 })
          }

          // Update configuration
          Object.assign(securitySystem.config, configuration)
          
          result = {
            message: 'Security configuration updated successfully',
            updated_config: securitySystem.config
          }
        } else {
          return NextResponse.json({
            success: false,
            error: 'Configuration data required'
          }, { status: 400 })
        }
        break

      case 'clear_blocked_ips':
        const clearedCount = securitySystem.blockedIPs.size
        securitySystem.blockedIPs.clear()
        
        result = {
          message: `Cleared ${clearedCount} blocked IPs`,
          cleared_count: clearedCount
        }
        break

      case 'reset_rate_limits':
        const resetCount = securitySystem.rateLimitStore.size
        securitySystem.rateLimitStore.clear()
        securitySystem.suspiciousActivities.clear()
        
        result = {
          message: `Reset rate limits for ${resetCount} IPs`,
          reset_count: resetCount
        }
        break

      case 'clear_security_events':
        const eventsCount = securitySystem.securityEvents.length
        securitySystem.securityEvents.length = 0
        
        result = {
          message: `Cleared ${eventsCount} security events from memory`,
          cleared_count: eventsCount
        }
        break

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
          available_actions: [
            'update_config',
            'clear_blocked_ips', 
            'reset_rate_limits',
            'clear_security_events'
          ]
        }, { status: 400 })
    }

    // Log the configuration change
    await securitySystem.logSecurityEvent('SECURITY_CONFIG_UPDATED', {
      ip: securitySystem.getClientIP(request),
      userEmail: authResult.user.email,
      action,
      configuration: configuration || null
    })

    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Security configuration update failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Security configuration update failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Helper functions
function generateSecurityAlerts() {
  const alerts = []
  const now = Date.now()
  const oneHourAgo = now - 60 * 60 * 1000

  // Check for blocked IPs
  if (securitySystem.blockedIPs.size > 0) {
    alerts.push({
      type: 'BLOCKED_IPS',
      severity: 'HIGH',
      message: `${securitySystem.blockedIPs.size} IP(s) currently blocked`,
      timestamp: new Date().toISOString()
    })
  }

  // Check for recent high-severity events
  const recentHighSeverityEvents = securitySystem.securityEvents.filter(
    event => event.severity === 'HIGH' || event.severity === 'CRITICAL'
  ).filter(event => new Date(event.timestamp).getTime() > oneHourAgo)

  if (recentHighSeverityEvents.length > 0) {
    alerts.push({
      type: 'HIGH_SEVERITY_EVENTS',
      severity: 'HIGH',
      message: `${recentHighSeverityEvents.length} high/critical severity events in the last hour`,
      timestamp: new Date().toISOString(),
      events: recentHighSeverityEvents.slice(0, 5)
    })
  }

  // Check for excessive rate limiting
  const rateLimitEvents = securitySystem.securityEvents.filter(
    event => event.type === 'RATE_LIMIT_EXCEEDED'
  ).filter(event => new Date(event.timestamp).getTime() > oneHourAgo)

  if (rateLimitEvents.length > 10) {
    alerts.push({
      type: 'EXCESSIVE_RATE_LIMITING',
      severity: 'MEDIUM',
      message: `${rateLimitEvents.length} rate limit violations in the last hour`,
      timestamp: new Date().toISOString()
    })
  }

  return alerts
}

function generateRealTimeRecommendations() {
  const recommendations = []

  // Check system state and generate recommendations
  if (securitySystem.blockedIPs.size > 5) {
    recommendations.push({
      priority: 'HIGH',
      message: 'Multiple IPs blocked - consider reviewing rate limit settings',
      action: 'Review and adjust rate limiting configuration'
    })
  }

  if (securitySystem.securityEvents.length > 500) {
    recommendations.push({
      priority: 'MEDIUM',
      message: 'High number of security events in memory',
      action: 'Consider implementing database persistence for security events'
    })
  }

  if (securitySystem.suspiciousActivities.size > 10) {
    recommendations.push({
      priority: 'MEDIUM',
      message: 'Multiple IPs with suspicious activity',
      action: 'Monitor and consider implementing stricter security measures'
    })
  }

  // Always include general recommendations
  recommendations.push({
    priority: 'LOW',
    message: 'Regular security monitoring is active',
    action: 'Continue monitoring and review alerts regularly'
  })

  return recommendations
}

function validateSecurityConfiguration(config) {
  const errors = []

  if (config.rateLimit) {
    if (config.rateLimit.windowMs && (config.rateLimit.windowMs < 60000 || config.rateLimit.windowMs > 3600000)) {
      errors.push('Rate limit window must be between 1 minute and 1 hour')
    }
    
    if (config.rateLimit.maxRequests && (config.rateLimit.maxRequests < 10 || config.rateLimit.maxRequests > 1000)) {
      errors.push('Max requests must be between 10 and 1000')
    }
  }

  if (config.security) {
    if (config.security.maxLoginAttempts && (config.security.maxLoginAttempts < 3 || config.security.maxLoginAttempts > 20)) {
      errors.push('Max login attempts must be between 3 and 20')
    }
  }

  if (config.validation) {
    if (config.validation.maxFileSize && (config.validation.maxFileSize < 1024 || config.validation.maxFileSize > 100 * 1024 * 1024)) {
      errors.push('Max file size must be between 1KB and 100MB')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
