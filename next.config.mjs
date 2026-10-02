/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // a esteira Python e os arquivos de rodada ficam fora do bundle
  experimental: { serverComponentsExternalPackages: [] },
  // Carimbo único por build. DEVE vir do ambiente (scripts/build-cf.mjs fixa antes do build),
  // senão o next.config roda Date.now() mais de uma vez (cliente × servidor) e os carimbos
  // divergem → VersionWatcher entra em loop de reload. O fallback é só para `next build` solto.
  env: { NEXT_PUBLIC_BUILD_STAMP: process.env.NEXT_PUBLIC_BUILD_STAMP || String(Date.now()) },
};
export default nextConfig;
