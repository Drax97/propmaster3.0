'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

import Header from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Database, 
  Save, 
  Globe, 
  Moon, 
  Sun 
} from 'lucide-react'

import LoadingSpinner from '@/components/layout/LoadingSpinner'

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' }
]

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time' },
  { value: 'Europe/London', label: 'British Time' }
]

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [mobileSectionOpen, setMobileSectionOpen] = useState({
    profile: false,
    notifications: false,
    privacy: false,
    system: false
  })
  const [settings, setSettings] = useState({
    profile: {
      name: session?.user?.name || '',
      email: session?.user?.email || '',
      avatar: session?.user?.image || ''
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: false,
      propertyUpdates: true,
      userRegistrations: true,
      paymentReminders: true
    },
    privacy: {
      profileVisibility: 'private',
      allowPropertySharing: true,
      dataExport: false
    },
    system: {
      theme: 'light',
      language: 'en',
      timezone: 'UTC'
    }
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session?.user?.status === 'pending' || session?.user?.role === 'pending') {
      router.push('/access-pending')
      return
    }
  }, [status, session, router])

  const handleSettingChange = useCallback((category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }))
  }, [])

  const toggleMobileSection = (section) => {
    setMobileSectionOpen(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const saveSettings = async () => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // TODO: Implement actual settings save logic
      console.log('Settings saved:', settings)
      
      // Show success notification
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="settings-loading">
        <LoadingSpinner size="lg" text="Loading settings..." />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="settings-page">
      <Header 
        session={session} 
        showBackButton={true} 
        backButtonLink="/dashboard"
      />

      <main className="settings-main">
        <section 
          className="settings-sections"
          data-testid="settings-sections"
        >
          {/* Profile Settings */}
          <div 
            className="settings-section"
            data-testid="profile-settings"
          >
            <div 
              className="settings-section-header"
              onClick={() => toggleMobileSection('profile')}
              data-testid="profile-section-header"
            >
              <div className="section-title">
                <User className="section-icon" />
                <h2>Profile Settings</h2>
              </div>
            </div>

            <div 
              className={`settings-section-content ${mobileSectionOpen.profile ? 'section-open' : ''}`}
            >
              <div className="settings-form-group">
                <label>Name</label>
                <Input 
                  value={settings.profile.name}
                  onChange={(e) => handleSettingChange('profile', 'name', e.target.value)}
                  data-testid="profile-name-input"
                />
              </div>
              <div className="settings-form-group">
                <label>Email</label>
                <Input 
                  type="email"
                  value={settings.profile.email}
                  onChange={(e) => handleSettingChange('profile', 'email', e.target.value)}
                  data-testid="profile-email-input"
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Notifications Settings */}
          <div 
            className="settings-section"
            data-testid="notifications-settings"
          >
            <div 
              className="settings-section-header"
              onClick={() => toggleMobileSection('notifications')}
              data-testid="notifications-section-header"
            >
              <div className="section-title">
                <Bell className="section-icon" />
                <h2>Notifications</h2>
              </div>
            </div>

            <div 
              className={`settings-section-content ${mobileSectionOpen.notifications ? 'section-open' : ''}`}
            >
              <div className="settings-switch-group">
                <label>Email Notifications</label>
                <Switch 
                  checked={settings.notifications.emailNotifications}
                  onCheckedChange={(value) => handleSettingChange('notifications', 'emailNotifications', value)}
                  data-testid="email-notifications-switch"
                />
              </div>
              <div className="settings-switch-group">
                <label>Property Updates</label>
                <Switch 
                  checked={settings.notifications.propertyUpdates}
                  onCheckedChange={(value) => handleSettingChange('notifications', 'propertyUpdates', value)}
                  data-testid="property-updates-switch"
                />
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div 
            className="settings-section"
            data-testid="privacy-settings"
          >
            <div 
              className="settings-section-header"
              onClick={() => toggleMobileSection('privacy')}
              data-testid="privacy-section-header"
            >
              <div className="section-title">
                <Shield className="section-icon" />
                <h2>Privacy</h2>
              </div>
            </div>

            <div 
              className={`settings-section-content ${mobileSectionOpen.privacy ? 'section-open' : ''}`}
            >
              <div className="settings-switch-group">
                <label>Profile Visibility</label>
                <Select
                  value={settings.privacy.profileVisibility}
                  onValueChange={(value) => handleSettingChange('privacy', 'profileVisibility', value)}
                  data-testid="profile-visibility-select"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="settings-switch-group">
                <label>Allow Property Sharing</label>
                <Switch 
                  checked={settings.privacy.allowPropertySharing}
                  onCheckedChange={(value) => handleSettingChange('privacy', 'allowPropertySharing', value)}
                  data-testid="property-sharing-switch"
                />
              </div>
            </div>
          </div>

          {/* System Preferences */}
          <div 
            className="settings-section"
            data-testid="system-settings"
          >
            <div 
              className="settings-section-header"
              onClick={() => toggleMobileSection('system')}
              data-testid="system-section-header"
            >
              <div className="section-title">
                <Database className="section-icon" />
                <h2>System Preferences</h2>
              </div>
            </div>

            <div 
              className={`settings-section-content ${mobileSectionOpen.system ? 'section-open' : ''}`}
            >
              <div className="settings-switch-group">
                <label>Theme</label>
                <Select
                  value={settings.system.theme}
                  onValueChange={(value) => handleSettingChange('system', 'theme', value)}
                  data-testid="theme-select"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center">
                        <Sun className="mr-2 h-4 w-4" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center">
                        <Moon className="mr-2 h-4 w-4" />
                        Dark
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="settings-switch-group">
                <label>Language</label>
                <Select
                  value={settings.system.language}
                  onValueChange={(value) => handleSettingChange('system', 'language', value)}
                  data-testid="language-select"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((option) => (
                      <SelectItem 
                        key={option.value} 
                        value={option.value}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="settings-switch-group">
                <label>Timezone</label>
                <Select
                  value={settings.system.timezone}
                  onValueChange={(value) => handleSettingChange('system', 'timezone', value)}
                  data-testid="timezone-select"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONE_OPTIONS.map((option) => (
                      <SelectItem 
                        key={option.value} 
                        value={option.value}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        <div className="settings-actions">
          <Button 
            onClick={saveSettings} 
            disabled={loading}
            data-testid="save-settings-button"
          >
            <Save className="button-icon" />
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </main>
    </div>
  )
}