import { supabaseProjectHostname } from "./src/lib/media/policy.mjs";

const supabaseHost = supabaseProjectHostname();

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(),
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "f58ed02c-bca7-4fe0-8416-a57caa52aea4-figmacachedpreview.figma.site",
      },
      ...(supabaseHost
        ? [
            {
              protocol: "https",
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/public-media/**",
            },
          ]
        : []),
    ],
  },

  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;