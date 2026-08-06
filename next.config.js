/** @type {import('next').NextConfig} */
const nextConfig = {
  // Gera um build "standalone" — ideal para imagem Docker enxuta.
  output: "standalone",
  // Não deixa avisos de lint (ex.: variável não usada) derrubarem o build.
  // O type-check do TypeScript CONTINUA ativo — erros de tipo ainda falham.
  eslint: { ignoreDuringBuilds: true },
  images: {
    // Permite logos hospedados no Supabase Storage (ajuste o host se usar outro).
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

module.exports = nextConfig;
