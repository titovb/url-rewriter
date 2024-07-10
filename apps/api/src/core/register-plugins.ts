import { FastifyInstance } from 'fastify'
import { Config } from './config'
import sensible from '@fastify/sensible'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import cors from '@fastify/cors'
import drizzle from '../plugins/drizzle'
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
      connectionString: config.db_url
    }
  })

  await app.register(urlRewriteChecker)
}
