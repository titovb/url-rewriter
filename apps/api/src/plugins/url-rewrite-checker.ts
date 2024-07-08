import { FastifyPluginAsync, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { urlRewrites } from '../db-schemas'
import { eq } from 'drizzle-orm'
import url from 'node:url'

const urlRewriteCheckerPlugin: FastifyPluginAsync = async (fastify) => {
  const findUrlRewrite = async (
    req: FastifyRequest
  ): Promise<string | null> => {
    if (req.method !== 'GET') return null

    const { drizzle: db } = req.server
    const { pathname, query } = url.parse(req.url, false)
    const queryPart = query ? '?' + query : ''

    const [found] = await db
      .select({ newUrl: urlRewrites.newUrl })
      .from(urlRewrites)
      .where(eq(urlRewrites.oldUrl, pathname!))
    return found ? found.newUrl + queryPart : null
  }

  fastify.setNotFoundHandler(async (req, reply) => {
    const rewrite = await findUrlRewrite(req)

    if (!rewrite) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Not Found'
      })
    }

    reply.code(301).redirect(rewrite)
  })

  const defaultHandler = fastify.errorHandler

  fastify.setErrorHandler(async (error, req, reply) => {
    if (error.statusCode !== 404) return defaultHandler(error, req, reply)

    const rewrite = await findUrlRewrite(req)
    if (!rewrite) return defaultHandler(error, req, reply)

    reply.code(301).redirect(rewrite)
  })
}

export default fp(urlRewriteCheckerPlugin, { dependencies: ['drizzle'] })
