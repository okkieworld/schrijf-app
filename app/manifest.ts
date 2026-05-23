import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'STELR Writer',
    short_name: 'STELR',
    description: 'De ultieme schrijf-app voor manuscripten en wereldbeheer.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#334a56',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable', // CRUCIEEL VOOR ANDROID: Vertelt Chrome dat dit icoon rond of vierkant afgesneden mag worden
      },
      {
        src: '/icons/icon-512x512.png?v=2',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable', // CRUCIEEL VOOR ANDROID
      },
      {
        src: '/apple-touch-icon.png?v=2',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}