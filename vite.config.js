import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// this provides ssl for local development when running app on dev mode on network.
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // for local development when running app on dev mode on network, this provides ssl for local development.
    basicSsl()
  ],
  // added this to http error when trying to connect to peer server on network.
  server: {
    host: true,
  }
})
