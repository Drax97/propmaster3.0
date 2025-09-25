/**
 * Utility functions for sharing properties
 */

/**
 * Copies text to clipboard and shows a toast notification
 * @param {string} text - Text to copy to clipboard
 * @param {Function} toast - Toast function from useToast hook
 * @param {string} successMessage - Success message to show (optional)
 */
export const copyToClipboard = async (text, toast, successMessage = 'Copied to clipboard!') => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      // Use the modern clipboard API
      await navigator.clipboard.writeText(text)
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      textArea.remove()
    }
    
    toast({
      title: successMessage,
      description: 'The link has been copied to your clipboard.',
    })
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    toast({
      title: 'Copy failed',
      description: 'Unable to copy to clipboard. Please try again.',
      variant: 'destructive',
    })
  }
}

/**
 * Generates a shareable URL for a property
 * @param {string} propertyId - The property ID
 * @param {string} propertyTitle - The property title (optional)
 * @returns {string} - The shareable URL
 */
export const generatePropertyShareUrl = (propertyId, propertyTitle = '') => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const shareUrl = `${baseUrl}/properties/${propertyId}`
  
  // If property title is provided, we could add it as a query parameter for better UX
  // but for now, we'll keep it simple with just the property ID
  return shareUrl
}

/**
 * Shares a property using the Web Share API if available, otherwise falls back to clipboard
 * @param {string} propertyId - The property ID
 * @param {string} propertyTitle - The property title
 * @param {Function} toast - Toast function from useToast hook
 */
export const shareProperty = async (propertyId, propertyTitle, toast) => {
  const shareUrl = generatePropertyShareUrl(propertyId, propertyTitle)
  const shareText = `Check out this property: ${propertyTitle || 'Property'}`

  // Check if the Web Share API is available and supported
  if (navigator.share && navigator.canShare && navigator.canShare({ url: shareUrl })) {
    try {
      await navigator.share({
        title: propertyTitle || 'Property',
        text: shareText,
        url: shareUrl,
      })
      
      toast({
        title: 'Shared successfully!',
        description: 'The property has been shared.',
      })
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error)
        // Fallback to clipboard if sharing fails
        await copyToClipboard(shareUrl, toast, 'Link copied to clipboard!')
      }
    }
  } else {
    // Fallback to clipboard copy
    await copyToClipboard(shareUrl, toast, 'Property link copied to clipboard!')
  }
}
