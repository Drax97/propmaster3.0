const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  experimental: {
    // serverExternalPackages has been replaced with serverComponentsExternalPackages
    serverComponentsExternalPackages: ['mongodb'],
  },
  webpack(config, { dev, isServer }) {
    if (dev) {
      // Reduce CPU/memory from file watching
      config.watchOptions = {
        poll: 1000, // check every 1 second (faster)
        aggregateTimeout: 200, // wait before rebuilding (faster)
        ignored: ['**/node_modules', '**/.git', '**/test_*.py'],
      };
      
      // Optimize for faster builds
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Bundle all vendor libraries
            vendor: {
              name: 'vendors',
              chunks: 'all',
              test: /node_modules/,
            },
          },
        },
      };
    }
    
    // Reduce bundle size
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
  onDemandEntries: {
    maxInactiveAge: 25000, // Increased for better caching
    pagesBufferLength: 5, // More pages in buffer
  },
  // Enable compression in development
  compress: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *;" },
          { key: "Access-Control-Allow-Origin", value: process.env.CORS_ORIGINS || "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "*" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
