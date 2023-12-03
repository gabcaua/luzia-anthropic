/** @type {import('next').NextConfig} */
const nextConfig = {
    swcMinify: true,
    compress: true,
    typescript: {
        ignoreBuildErrors: true
    },
    experimental: {
        appDocumentPreloading: true,
        optimizeCss: true,
        swcMinify: true
    },
    eslint: {
        ignoreDuringBuilds: true
    }
}

module.exports = nextConfig
