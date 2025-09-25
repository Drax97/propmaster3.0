'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover'
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from '@/components/ui/command'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  User, 
  Search, 
  Loader2, 
  Check, 
  AlertCircle,
  ChevronDown,
  UserCheck
} from 'lucide-react'

/**
 * User Client Selector Component
 * Allows selection of clients from the users table in the database
 */
export function UserClientSelector({ 
  value = '', // user ID
  onValueChange,
  clientName = '',
  onClientNameChange,
  placeholder = 'Select a client',
  required = false,
  disabled = false,
  className = ''
}) {
  const [selectedUserId, setSelectedUserId] = useState(value)
  const [selectedUserName, setSelectedUserName] = useState(clientName)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch users from the database
  const fetchUsers = useCallback(async (search = '') => {
    setIsLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      if (search.trim()) {
        params.append('search', search.trim())
      }

      const response = await fetch(`/api/users/clients?${params}`)
      const data = await response.json()

      if (response.ok && data.success) {
        setUsers(data.users || [])
      } else {
        setError(data.error || 'Failed to fetch users')
        setUsers([])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      setError('Network error occurred while fetching users')
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle user selection
  const handleSelectUser = (user) => {
    setSelectedUserId(user.id)
    setSelectedUserName(user.name || user.email)
    setIsOpen(false)
    setError('')

    // Update parent component
    if (onValueChange) {
      onValueChange(user.id)
    }
    if (onClientNameChange) {
      onClientNameChange(user.name || user.email)
    }
  }

  // Handle search input change
  const handleSearchChange = (query) => {
    setSearchQuery(query)
    if (query.length >= 2 || query.length === 0) {
      fetchUsers(query)
    }
  }

  // Clear selection
  const handleClear = () => {
    setSelectedUserId('')
    setSelectedUserName('')
    if (onValueChange) {
      onValueChange('')
    }
    if (onClientNameChange) {
      onClientNameChange('')
    }
  }

  // Load users on component mount and when opened
  useEffect(() => {
    if (isOpen && users.length === 0) {
      fetchUsers()
    }
  }, [isOpen, users.length, fetchUsers])

  // Sync with external value changes
  useEffect(() => {
    if (value !== selectedUserId) {
      setSelectedUserId(value)
      // If we have a value but no name, we might need to fetch the user details
      if (value && !clientName) {
        // Find user in current list or fetch details
        const user = users.find(u => u.id === value)
        if (user) {
          setSelectedUserName(user.name || user.email)
        }
      }
    }
  }, [value, selectedUserId, clientName, users])

  useEffect(() => {
    if (clientName !== selectedUserName) {
      setSelectedUserName(clientName)
    }
  }, [clientName, selectedUserName])

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 flex items-center">
          <User className="h-4 w-4 mr-1" />
          Client {required && '*'}
        </label>

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={isOpen}
              className="w-full justify-between text-left font-normal"
              disabled={disabled}
            >
              {selectedUserName ? (
                <div className="flex items-center space-x-2">
                  <UserCheck className="h-4 w-4 text-green-600" />
                  <span>{selectedUserName}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-gray-500">
                  <User className="h-4 w-4" />
                  <span>{placeholder}</span>
                </div>
              )}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Search clients by name or email..." 
                value={searchQuery}
                onValueChange={handleSearchChange}
              />
              <CommandList>
                {isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm text-gray-500">Loading clients...</span>
                  </div>
                ) : (
                  <>
                    <CommandEmpty>
                      {searchQuery ? 'No clients found matching your search.' : 'No clients available.'}
                    </CommandEmpty>
                    <CommandGroup heading="Available Clients">
                      {users.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={user.id}
                          onSelect={() => handleSelectUser(user)}
                          className="flex items-center space-x-3 cursor-pointer"
                        >
                          <User className="h-4 w-4 text-gray-400" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {user.name || 'No Name'}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                              {user.email}
                            </div>
                          </div>
                          {selectedUserId === user.id && (
                            <Check className="h-4 w-4 text-green-600" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {selectedUserName && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <UserCheck className="h-3 w-3" />
              <span>Client selected: {selectedUserName}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
              className="h-6 px-2 text-xs"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Helper Text */}
      {!error && !selectedUserName && (
        <p className="text-xs text-gray-500">
          Select a client from the registered users in your database
        </p>
      )}
    </div>
  )
}

export default UserClientSelector
