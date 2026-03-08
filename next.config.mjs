/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Desabilita o proxy de imagens do Next.js — carrega direto no browser
    // sem passar pelo servidor (evita 403 em CDNs com proteção de origem)
    unoptimized: true,
  },
};

export default nextConfig;
