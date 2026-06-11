/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backend = process.env.BACKEND_URL || "http://localhost:4000";
    return [{ source: "/api/:path*", destination: `${backend}/:path*` }];
  },
};
export default nextConfig;
