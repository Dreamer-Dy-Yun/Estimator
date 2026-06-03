import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const fromNodePackage: (moduleId: string, packageName: string) => boolean = (moduleId: string, packageName: string) : boolean =>
  moduleId.includes(`node_modules/${packageName}/`) ||
  moduleId.endsWith(`node_modules/${packageName}`) ||
  moduleId.includes(`node_modules\\${packageName}\\`) ||
  moduleId.endsWith(`node_modules\\${packageName}`)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
  build: {
    // Vite 8 default OXC minifier currently breaks react-katex HTML output in production.
    // Keep the existing react-katex path and use esbuild minification until that upstream path is safe.
    minify: 'esbuild',
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: (moduleId: string) : boolean =>
                fromNodePackage(moduleId, 'react') ||
                fromNodePackage(moduleId, 'react-dom') ||
                fromNodePackage(moduleId, 'scheduler'),
              priority: 30,
            },
            {
              name: 'vendor-router',
              test: (moduleId: string) : boolean =>
                fromNodePackage(moduleId, 'react-router') || fromNodePackage(moduleId, 'react-router-dom'),
              priority: 25,
            },
            {
              name: 'vendor-charts',
              test: (moduleId: string) : boolean =>
                fromNodePackage(moduleId, 'recharts') ||
                fromNodePackage(moduleId, 'd3-array') ||
                fromNodePackage(moduleId, 'd3-color') ||
                fromNodePackage(moduleId, 'd3-ease') ||
                fromNodePackage(moduleId, 'd3-format') ||
                fromNodePackage(moduleId, 'd3-interpolate') ||
                fromNodePackage(moduleId, 'd3-path') ||
                fromNodePackage(moduleId, 'd3-scale') ||
                fromNodePackage(moduleId, 'd3-shape') ||
                fromNodePackage(moduleId, 'd3-time') ||
                fromNodePackage(moduleId, 'd3-time-format') ||
                fromNodePackage(moduleId, 'd3-timer') ||
                fromNodePackage(moduleId, 'victory-vendor'),
              priority: 20,
            },
            {
              name: 'vendor-math',
              test: (moduleId: string) : boolean => fromNodePackage(moduleId, 'katex') || fromNodePackage(moduleId, 'react-katex'),
              priority: 20,
            },
            {
              name: 'vendor-excel',
              test: (moduleId: string) : boolean => fromNodePackage(moduleId, 'exceljs'),
              priority: 20,
            },
            {
              name: 'vendor',
              test: 'node_modules',
              priority: 10,
            },
          ],
        },
      },
    },
    // ExcelJS is a lazy download-only chunk; keep this warning focused on non-feature chunks.
    chunkSizeWarningLimit: 1000,
  },
})
