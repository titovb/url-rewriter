import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db-schemas/*',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DB_URL,
  }
})
