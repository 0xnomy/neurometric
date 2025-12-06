/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    compress: true,
    productionBrowserSourceMaps: false,
    staticPageGenerationTimeout: 30,

    experimental: {
        optimizePackageImports: [
            'groq-sdk',
        ],
    },

    headers: async () => {
        return [
            {
                source: '/public/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
