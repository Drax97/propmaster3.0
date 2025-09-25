import { NextResponse } from 'next/server'
import { securitySystem } from '@/lib/security/security-system'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

/**
 * Security Audit API
 * 
 * GET /api/security/audit - Get security audit report
 * POST /api/security/audit - Perform security scan
 */

export async function GET(request) {
  try {
    // Check authentication and permissions
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only master users can view security audits
    if (session.user.role !== 'master') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only master users can view security audits.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const severity = searchParams.get('severity')
    const eventType = searchParams.get('eventType')
    const limit = parseInt(searchParams.get('limit')) || 100

    console.log(`🔍 Security audit requested by: ${session.user.email}`)

    // Get audit report
    const auditReport = await securitySystem.getSecurityAuditReport({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      severity,
      eventType,
      limit
    })

    if (!auditReport.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to generate audit report',
        details: auditReport.error
      }, { status: 500 })
    }

    // Add system health indicators
    const systemHealth = {
      rateLimitActive: securitySystem.rateLimitStore.size > 0,
      blockedIPsCount: securitySystem.blockedIPs.size,
      recentEventsCount: securitySystem.securityEvents.length,
      suspiciousActivitiesCount: securitySystem.suspiciousActivities.size
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      audit_report: auditReport,
      system_health: systemHealth,
      query_parameters: {
        startDate,
        endDate,
        severity,
        eventType,
        limit
      }
    })

  } catch (error) {
    console.error('❌ Security audit failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Security audit failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    // Check authentication and permissions
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only master users can perform security scans
    if (session.user.role !== 'master') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only master users can perform security scans.' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { scanType = 'full' } = body

    console.log(`🔒 Security scan requested by: ${session.user.email}`)
    console.log(`📊 Scan type: ${scanType}`)

    // Log the security scan initiation
    await securitySystem.logSecurityEvent('SECURITY_SCAN_INITIATED', {
      ip: securitySystem.getClientIP(request),
      userEmail: session.user.email,
      scanType
    })

    // Perform security scan
    const scanResult = await securitySystem.performSecurityScan()

    if (!scanResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Security scan failed',
        details: scanResult.error,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    // Log scan completion
    await securitySystem.logSecurityEvent('SECURITY_SCAN_COMPLETED', {
      ip: securitySystem.getClientIP(request),
      userEmail: session.user.email,
      scanType,
      securityScore: scanResult.securityScore,
      vulnerabilitiesFound: scanResult.vulnerabilities.length
    })

    return NextResponse.json({
      success: true,
      message: 'Security scan completed successfully',
      scan_result: {
        timestamp: scanResult.timestamp,
        security_score: scanResult.securityScore,
        vulnerabilities_count: scanResult.vulnerabilities.length,
        vulnerabilities: scanResult.vulnerabilities,
        recommendations: scanResult.overallRecommendations,
        next_scan_recommended: scanResult.nextScanRecommended
      },
      scan_summary: {
        critical_issues: scanResult.vulnerabilities.filter(v => v.severity === 'CRITICAL').length,
        high_issues: scanResult.vulnerabilities.filter(v => v.severity === 'HIGH').length,
        medium_issues: scanResult.vulnerabilities.filter(v => v.severity === 'MEDIUM').length,
        low_issues: scanResult.vulnerabilities.filter(v => v.severity === 'LOW').length,
        overall_status: scanResult.securityScore >= 80 ? 'GOOD' : 
                       scanResult.securityScore >= 60 ? 'FAIR' : 'NEEDS_ATTENTION'
      }
    })

  } catch (error) {
    console.error('❌ Security scan failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Security scan failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
