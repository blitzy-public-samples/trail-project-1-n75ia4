import { defineConfig } from 'vite'; // v4.4.0
import react from '@vitejs/plugin-react'; // v4.0.0
import tsconfigPaths from 'vite-tsconfig-paths'; // v4.2.0
import { resolve } from 'path'; // v0.12.7
import type { UserConfig } from 'vite';

// Environment variable type augmentation
declare module 'vite' {
  interface ImportMetaEnv extends Readonly<Record<string, string>> {
    readonly VITE_API_BASE_URL: string;
    readonly VITE_WS_URL: string;
    readonly VITE_APP_ENV: 'development' | 'staging' | 'production';
  }
}

// Helper function to resolve paths
const resolvePath = (dir: string): string => resolve(__dirname, dir);

// Configuration for different environments
const getEnvConfig = (mode: string): Partial<UserConfig> => ({
  define: {
    __DEV__: mode === 'development',
    __PROD__: mode === 'production',
    __TEST__: mode === 'test',
  }
});

export default defineConfig(({ command, mode }) => {
  const envConfig = getEnvConfig(mode);

  return {
    // Plugin Configuration
    plugins: [
      react({
        // Enable Fast Refresh for rapid development
        fastRefresh: true,
        // Babel configuration for emotion styling
        babel: {
          plugins: ['@emotion/babel-plugin'],
          // Production optimizations
          ...(mode === 'production' && {
            compact: true,
            minified: true
          })
        }
      }),
      // TypeScript path resolution
      tsconfigPaths({
        projects: ['./tsconfig.json']
      })
    ],

    // Path Resolution Configuration
    resolve: {
      alias: {
        '@': resolvePath('src'),
        '@components': resolvePath('src/components'),
        '@pages': resolvePath('src/pages'),
        '@hooks': resolvePath('src/hooks'),
        '@utils': resolvePath('src/utils'),
        '@services': resolvePath('src/services'),
        '@types': resolvePath('src/types'),
        '@constants': resolvePath('src/constants'),
        '@assets': resolvePath('src/assets'),
        '@styles': resolvePath('src/styles')
      },
      // Preferred extensions order
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json']
    },

    // Development Server Configuration
    server: {
      port: 3000,
      host: true,
      // CORS configuration
      cors: {
        origin: ['http://localhost:8000'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true
      },
      // API proxy configuration
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '')
        },
        '/ws': {
          target: 'ws://localhost:8000',
          ws: true,
          changeOrigin: true
        }
      },
      // Watch configuration
      watch: {
        usePolling: true,
        interval: 1000
      }
    },

    // Build Configuration
    build: {
      outDir: 'dist',
      // Enable source maps for debugging
      sourcemap: mode !== 'production',
      // Use Terser for better minification
      minify: 'terser',
      // Browser compatibility targets
      target: ['chrome90', 'firefox88', 'safari14', 'edge90'],
      // CSS code splitting
      cssCodeSplit: true,
      // Chunk size warning limit (in kB)
      chunkSizeWarningLimit: 1000,
      // Terser optimization options
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
          pure_funcs: mode === 'production' ? ['console.log'] : []
        }
      },
      // Rollup specific options
      rollupOptions: {
        output: {
          // Manual chunk splitting for optimal loading
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['@mui/material', '@emotion/react', '@emotion/styled'],
            utils: ['lodash', 'date-fns', 'uuid'],
            state: ['redux', '@reduxjs/toolkit', 'react-redux']
          },
          // Asset file naming
          assetFileNames: (assetInfo) => {
            const extType = assetInfo.name.split('.').at(1);
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              return `assets/images/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
          // Chunk file naming
          chunkFileNames: 'assets/js/[name]-[hash].js',
          // Entry file naming
          entryFileNames: 'assets/js/[name]-[hash].js'
        }
      },
      // Reporting options
      reportCompressedSize: true,
      // Cache busting
      assetsInlineLimit: 4096
    },

    // Preview server configuration
    preview: {
      port: 3000,
      host: true,
      strictPort: true
    },

    // Performance optimizations
    optimizeDeps: {
      // Force inclusion of indirect dependencies
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@emotion/react',
        '@emotion/styled',
        '@mui/material'
      ],
      // Exclude server-only dependencies
      exclude: ['@types/*']
    },

    // Environment variables configuration
    envPrefix: 'VITE_',
    
    // Merge environment-specific configuration
    ...envConfig
  };
});