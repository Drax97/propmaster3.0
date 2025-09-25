'use client'

import { useState, useRef, useEffect } from 'react'
import { Building2 } from 'lucide-react'

export default function LazyImage({ 
  src, 
  alt, 
  className = "", 
  fallbackIcon: FallbackIcon = Building2,
  aspectRatio = "aspect-video" 
}) {
  const [isInView, setIsInView] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '50px' // Load images 50px before they come into view
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const handleLoad = () => {
    setIsLoaded(true)
  }

  const handleError = () => {
    setHasError(true)
    setIsLoaded(true)
  }

  return (
    <div 
      ref={imgRef}
      className={`${aspectRatio} bg-gray-100 rounded-lg overflow-hidden ${className}`}
    >
      {!isInView ? (
        // Placeholder while not in view
        <div className="w-full h-full flex items-center justify-center animate-pulse">
          <div className="w-8 h-8 bg-gray-300 rounded"></div>
        </div>
      ) : hasError || !src ? (
        // Error state or no image
        <div className="w-full h-full flex items-center justify-center">
          <FallbackIcon className="h-12 w-12 text-gray-400" />
        </div>
      ) : (
        // Image loading/loaded state
        <div className="relative w-full h-full">
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center animate-pulse">
              <div className="w-8 h-8 bg-gray-300 rounded"></div>
            </div>
          )}
          <img
            src={src}
            alt={alt}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={handleLoad}
            onError={handleError}
            loading="lazy"
          />
        </div>
      )}
    </div>
  )
}
