module.exports = {
  // TypeScript output
  typescript: true,
  // Export as default
  exportType: 'default',
  // No ref forwarding
  ref: false,
  // Enable title prop for accessibility
  titleProp: true,
  // Add role="img" to all SVGs
  svgProps: {
    role: 'img',
  },
  // Use automatic JSX runtime (React 17+)
  jsxRuntime: 'automatic',
  // File naming
  filenameCase: 'pascal',
  // Don't add 'Svg' prefix to component names
  namedExport: false,
  // Index file generation
  index: true,
  // Plugins
  plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx'],
};
