// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  reactStrictMode: true,
  swcMinify: true, // keeps JS minified for performance
  images: {
    formats: ['image/avif', 'image/webp'], // optimize images
  },
});
