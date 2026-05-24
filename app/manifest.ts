import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "STELR Writer",
    short_name: "STELR",
    description: "De ultieme schrijf-app voor manuscripten en wereldbeheer.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#334a56",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}