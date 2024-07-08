import { Client, ClientConfig } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { FastifyPluginAsync } from 'fastify'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import fp from 'fastify-plugin'
import { DrizzleConfig } from 'drizzle-orm'
import { MigrationConfig } from 'drizzle-orm/migrator'

interface DrizzlePluginOptions {
  pgClient: ClientConfig
  drizzle: DrizzleConfig
  migration?: MigrationConfig
}

const drizzlePlugin: FastifyPluginAsync<DrizzlePluginOptions> = async (
  fastify,
  options
) => {
  if (fastify.drizzle) return

  const client = new Client(options.pgClient)
  await client.connect()

  const db = drizzle(client)

  if (options.migration) {
    await migrate(db, options.migration)
  }

  fastify.decorate('drizzle', db)

  fastify.addHook('onClose', async (fastify) => {
    if (fastify.drizzle) {
      await client.end()
    }
  })
}

export default fp(drizzlePlugin, { name: 'drizzle' })
