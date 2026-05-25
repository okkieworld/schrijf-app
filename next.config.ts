import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true, // Dit mag blijven staan
});

const nextConfig: NextConfig = {
  /* Jouw eventuele andere config opties */
};

export default withPWA(nextConfig);