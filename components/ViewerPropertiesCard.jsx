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
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Properties Available for Sale
          </CardTitle>
          <CardDescription className="text-sm">
            Browse available properties in our portfolio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingSpinner size="md" text="Loading properties..." />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Properties Available for Sale
          </CardTitle>
          <CardDescription className="text-sm">
            Browse available properties in our portfolio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button 
              variant="outline" 
              onClick={fetchPropertiesData}
              className="hover:shadow-md transition-all duration-200"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Properties Available for Sale
          </CardTitle>
          <CardDescription className="text-sm">
            Browse available properties in our portfolio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
            <Card className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.totalProperties}</p>
                  <p className="text-xs text-blue-600/70 font-medium">Total Properties</p>
                </div>
                <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
              </div>
            </Card>
            <Card className="p-3 sm:p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">
                    ₹{stats.cheapestPrice > 0 ? stats.cheapestPrice.toLocaleString() : '0'}
                  </p>
                  <p className="text-xs text-green-600/70 font-medium">Starting From</p>
                </div>
                <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
              </div>
            </Card>
          </div>

          {/* Featured Properties Preview */}
          {properties.length > 0 ? (
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Featured Properties
              </h4>
              <div className="space-y-3">
                {properties.map((property) => (
                  <Card key={property.id} className="group hover:shadow-md transition-all duration-200 hover:scale-[1.02] cursor-pointer">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <h5 className="font-medium text-sm leading-tight">{property.name}</h5>
                            <Badge 
                              variant="secondary" 
                              className="text-xs flex-shrink-0"
                            >
                              {property.status}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            {property.location && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground truncate">{property.location}</span>
                              </div>
                            )}
                            {property.price && (
                              <div className="flex items-center gap-1.5">
                                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm font-semibold text-primary">
                                  ₹{property.price.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Link href={`/properties/${property.id}`}>
                          <Button variant="ghost" size="sm" className="ml-2 p-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No properties available at the moment</p>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-4 border-t">
            <Link href="/properties" className="block">
              <Button className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90 transition-all duration-200 hover:shadow-md">
                <Building2 className="mr-2 h-5 w-5" />
                View All Properties
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
