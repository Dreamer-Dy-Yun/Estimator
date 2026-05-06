import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const fromNodePackage = (moduleId: string, packageName: string) =>
  moduleId.includes(`node_modules/${packageName}/`) ||
  moduleId.endsWith(`node_modules/${packageName}`) ||
  moduleId.includes(`node_modules\\${packageName}\\`) ||
  moduleId.endsWith(`node_modules\\${packageName}`)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: (moduleId) =>
                fromNodePackage(moduleId, 'react') ||
                fromNodePackage(moduleId, 'react-dom') ||
                fromNodePackage(moduleId, 'scheduler'),
              priority: 30,
            },
            {
              name: 'vendor-router',
              test: (moduleId) =>
                fromNodePackage(moduleId, 'react-router') || fromNodePackage(moduleId, 'react-router-dom'),
              priority: 25,
            },
            {
              name: 'vendor-charts',
              test: (moduleId) =>
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
              test: (moduleId) => fromNodePackage(moduleId, 'katex') || fromNodePackage(moduleId, 'react-katex'),
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
  },
})
