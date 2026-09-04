/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ufc.com", port: "", pathname: "/images/**" },
      { protocol: "https", hostname: "www.ufc.com", port: "", pathname: "/images/**" },
      { protocol: "https", hostname: "ufc.com.br", port: "", pathname: "/images/**" },
      { protocol: "https", hostname: "www.ufc.com.br", port: "", pathname: "/images/**" },
    ],
    formats: ["image/webp"],
    qualities: [80],
    maximumRedirects: 3,
  },
};

export default nextConfig;
