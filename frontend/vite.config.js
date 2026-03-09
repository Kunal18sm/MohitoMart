import { readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const removeTempPublicFiles = () => ({
    name: 'remove-temp-public-files',
    closeBundle() {
        const distDir = join(__dirname, 'dist')

        const walk = (currentDir) => {
            for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
                const entryPath = join(currentDir, entry.name)

                if (entry.isDirectory()) {
                    walk(entryPath)
                    continue
                }

                if (entry.name.endsWith('.__tmp')) {
                    rmSync(entryPath, { force: true })
                }
            }
        }

        walk(distDir)
    },
})

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        removeTempPublicFiles(),
    ],
})
