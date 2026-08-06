/** @type {import('next').NextConfig} */
const nextConfig = {
  // Gera um build "standalone" — ideal para imagem Docker enxuta.
  output: "standalone",
  images: {
    // Permite logos hospedados no Supabase Storage (ajuste o host se usar outro).
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

module.exports = nextConfig;
