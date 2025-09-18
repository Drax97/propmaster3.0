'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Eye, MapPin, DollarSign } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ViewerPropertiesCard() {
  const [properties, setProperties] = useState([]);
  const [stats, setStats] = useState({
    totalProperties: 0,
    cheapestPrice: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPropertiesData();
  }, []);

  const fetchPropertiesData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/properties?status=available');
      const data = await response.json();
      
      if (response.ok) {
        const availableProperties = data.properties || [];
        setProperties(availableProperties.slice(0, 3)); // Show only first 3 for preview
        
        // Calculate stats
        const totalAvailable = availableProperties.length;
        const cheapestPrice = totalAvailable > 0 
          ? Math.min(...availableProperties.map(prop => prop.price || Infinity).filter(price => price !== Infinity))
          : 0;

        setStats({
          totalProperties: totalAvailable,
          cheapestPrice: isFinite(cheapestPrice) ? cheapestPrice : 0
        });
      } else {
        setError('Failed to fetch properties');
      }
    } catch (err) {
      console.error('Error fetching properties:', err);
      setError('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="viewer-properties-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Properties Available
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" text="Loading properties..." />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="viewer-properties-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Properties Available
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchPropertiesData}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="viewer-properties-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Properties Available for Sale
        </CardTitle>
        <CardDescription>
          Browse available properties in our portfolio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Overview */}
        <div className="properties-stats-grid">
          <div className="stat-item">
            <div className="stat-value">{stats.totalProperties}</div>
            <div className="stat-label">Total Properties</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">
              ₹{stats.cheapestPrice > 0 ? stats.cheapestPrice.toLocaleString() : '0'}
            </div>
            <div className="stat-label">Starting From</div>
          </div>
        </div>

        {/* Featured Properties Preview */}
        {properties.length > 0 ? (
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Featured Properties
            </h4>
            <div className="properties-preview-list">
              {properties.map((property) => (
                <div key={property.id} className="property-preview-item">
                  <div className="property-preview-content">
                    <div className="property-preview-header">
                      <h5 className="property-preview-title">{property.name}</h5>
                      <Badge 
                        variant="secondary" 
                        className="property-status-badge"
                      >
                        {property.status}
                      </Badge>
                    </div>
                    <div className="property-preview-details">
                      {property.location && (
                        <div className="property-detail">
                          <MapPin className="property-detail-icon" />
                          <span className="property-detail-text">{property.location}</span>
                        </div>
                      )}
                      {property.price && (
                        <div className="property-detail">
                          <DollarSign className="property-detail-icon" />
                          <span className="property-detail-text">
                            ₹{property.price.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Link href={`/properties/${property.id}`}>
                    <Button variant="ghost" size="sm" className="property-preview-action">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <Building2 className="empty-state-icon" />
            <p className="empty-state-text">No properties available at the moment</p>
          </div>
        )}

        {/* Action Button */}
        <div className="card-actions">
          <Link href="/properties" className="w-full">
            <Button className="w-full">
              <Building2 className="mr-2 h-4 w-4" />
              View All Properties
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
