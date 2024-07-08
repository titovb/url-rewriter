import { FastifyInstance } from 'fastify'
import { Config } from './config'
import sensible from '@fastify/sensible'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import cors from '@fastify/cors'
import drizzle from '../plugins/drizzle'
import * as schema from '../db-schemas'
import urlRewriteChecker from '../plugins/url-rewrite-checker'

export const registerPlugins = async (app: FastifyInstance, config: Config) => {
  await app.register(cors)
  await app.register(sensible, {
    sharedSchemaId: 'httpError'
  })

  if (config.node_env === 'development') {
    await app.register(swagger)
    await app.register(swaggerUi, {
      routePrefix: '/docs'
    })
  }

  await app.register(drizzle, {
    pgClient: {
      host: config.db_host,
      port: config.db_port,
      user: config.db_user,
      password: config.db_password,
      database: config.db_name
    },
    drizzle: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      schema: schema as any
    },
    migration: {
      migrationsFolder: 'drizzle'
    }
  })

  await app.register(urlRewriteChecker)
}
