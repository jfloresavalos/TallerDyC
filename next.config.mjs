/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "@radix-ui/react-dialog", "@radix-ui/react-select"],
  },
}

export default nextConfig
