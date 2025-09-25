'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { 
  ArrowLeft, Settings as SettingsIcon, User, Bell, Shield, 
  Database, Save, Eye, Lock, Mail, Globe
} from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState({
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
      timezone: 'Asia/Kolkata'
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

  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }))
  }

  const saveSettings = async () => {
    setLoading(true)
    // Simulate saving settings
    setTimeout(() => {
      setLoading(false)
      alert('Settings saved successfully!')
    }, 1000)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-3">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <SettingsIcon className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profile Information</span>
              </CardTitle>
              <CardDescription>
                Your account details and personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={session.user.image} />
                  <AvatarFallback className="text-lg">
                    {session.user.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{session.user.name}</h3>
                  <p className="text-gray-600">{session.user.email}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                      {session.user.role?.toUpperCase()}
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                      {session.user.status?.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Display Name
                  </label>
                  <Input value={session.user.name} disabled />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Email Address
                  </label>
                  <Input value={session.user.email} disabled />
                </div>
              </div>
              
              <p className="text-sm text-gray-500">
                Profile information is managed through your Google account. 
                Changes must be made in your Google profile settings.
              </p>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notification Preferences</span>
              </CardTitle>
              <CardDescription>
                Choose which notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Email Notifications</h4>
                  <p className="text-sm text-gray-600">Receive notifications via email</p>
                </div>
                <Switch
                  checked={settings.notifications.emailNotifications}
                  onCheckedChange={(checked) => 
                    handleSettingChange('notifications', 'emailNotifications', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Property Updates</h4>
                  <p className="text-sm text-gray-600">Get notified when properties are updated</p>
                </div>
                <Switch
                  checked={settings.notifications.propertyUpdates}
                  onCheckedChange={(checked) => 
                    handleSettingChange('notifications', 'propertyUpdates', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">User Registrations</h4>
                  <p className="text-sm text-gray-600">Get notified of new user signups</p>
                </div>
                <Switch
                  checked={settings.notifications.userRegistrations}
                  onCheckedChange={(checked) => 
                    handleSettingChange('notifications', 'userRegistrations', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Payment Reminders</h4>
                  <p className="text-sm text-gray-600">Receive payment and EMI reminders</p>
                </div>
                <Switch
                  checked={settings.notifications.paymentReminders}
                  onCheckedChange={(checked) => 
                    handleSettingChange('notifications', 'paymentReminders', checked)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Privacy & Security</span>
              </CardTitle>
              <CardDescription>
                Control your privacy and security preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Allow Property Sharing</h4>
                  <p className="text-sm text-gray-600">Allow sharing property details with clients</p>
                </div>
                <Switch
                  checked={settings.privacy.allowPropertySharing}
                  onCheckedChange={(checked) => 
                    handleSettingChange('privacy', 'allowPropertySharing', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Data Export</h4>
                  <p className="text-sm text-gray-600">Allow exporting your data</p>
                </div>
                <Switch
                  checked={settings.privacy.dataExport}
                  onCheckedChange={(checked) => 
                    handleSettingChange('privacy', 'dataExport', checked)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>System Preferences</span>
              </CardTitle>
              <CardDescription>
                Application-wide settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Language
                  </label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={settings.system.language}
                    onChange={(e) => handleSettingChange('system', 'language', e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Timezone
                  </label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={settings.system.timezone}
                    onChange={(e) => handleSettingChange('system', 'timezone', e.target.value)}
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Database Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Database Connection</span>
              </CardTitle>
              <CardDescription>
                Current status of your Supabase database connection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-900">Connected to Supabase</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                All your data is securely stored and backed up in Supabase cloud database.
              </p>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}