import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // Dit zorgt ervoor dat de plugin niet vecht met app/manifest.ts:
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  /* Jouw eventuele andere config opties */
};

export default withPWA(nextConfig);