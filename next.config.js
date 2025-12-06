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
            {
                source: '/:path*.wasm',
                headers: [
                    {
                        key: 'Content-Type',
                        value: 'application/wasm',
                    },
                    {
                        key: 'Cross-Origin-Embedder-Policy',
                        value: 'require-corp',
                    },
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin',
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
