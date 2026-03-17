import { defineConfig } from 'vite-plus/pack'

export default defineConfig({
  dts: {
    tsgo: true,
  },
  exports: true,
  // ...config options
  // CRITICAL: Unbundle mode - keeps source directory structure
  // Each source file gets its own output file
  unbundle: true,
  // Set the root for module resolution
  cwd: process.cwd(),
})
