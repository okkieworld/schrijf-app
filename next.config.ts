import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Dit zorgt ervoor dat als er gezocht wordt naar manifest.json, 
  // Next.js de nieuwe foutloze manifest-route serveert!
  async rewrites() {
    return [
      {
        source: "/manifest.json",
        destination: "/manifest.webmanifest",
      },
    ];
  },
};

export default withPWA(nextConfig);