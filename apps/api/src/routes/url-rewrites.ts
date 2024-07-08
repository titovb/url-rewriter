import { FastifyRequest, RouteHandlerMethod, RouteOptions } from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { selectUrlRewriteSchema, UrlRewrite, urlRewrites } from '../db-schemas'
import {
  CreateUrlRewrite,
  createUrlRewriteSchema,
  Pagination,
  paginationSchema
} from '../dto'
import { handleDbDuplicateError } from '../core'
import { count, eq, or } from 'drizzle-orm'

const idParamSchema = Type.Object({
  id: Type.Number()
})
type IdParam = Static<typeof idParamSchema>

const get: RouteOptions = {
  url: '/url-rewrites',
  method: 'GET',
  schema: {
    querystring: paginationSchema,
    response: {
      200: Type.Array(selectUrlRewriteSchema)
    }
  },
  handler: (async (
    req: FastifyRequest<{ Querystring: Pagination; Reply: UrlRewrite[] }>
  ) => {
    const { drizzle: db } = req.server
    const { offset, limit } = req.query

    const query = db.select().from(urlRewrites)
    if (offset != null) query.offset(offset)
    if (limit != null) query.limit(limit)

    return query
  }) as RouteHandlerMethod
}

const create: RouteOptions = {
  url: '/url-rewrites',
  method: 'POST',
  schema: {
    body: createUrlRewriteSchema,
    response: {
      200: selectUrlRewriteSchema,
      400: { $ref: 'httpError' },
      409: { $ref: 'httpError' }
    }
  },
  handler: (async (
    req: FastifyRequest<{ Body: CreateUrlRewrite; Reply: UrlRewrite }>
  ) => {
    const { drizzle: db, httpErrors } = req.server
    const dto = req.body

    const [existingUrlsCount] = await db
      .select({ count: count() })
      .from(urlRewrites)
      .where(
        or(
          eq(urlRewrites.newUrl, dto.oldUrl),
          eq(urlRewrites.oldUrl, dto.newUrl)
        )
      )
    if (existingUrlsCount.count > 0)
      throw httpErrors.conflict('Url rewrite already exists')

    try {
      const [created] = await db.insert(urlRewrites).values(dto).returning()
      return created
    } catch (error) {
      handleDbDuplicateError(
        error,
        httpErrors.conflict('Url rewrite already exists')
      )
      throw error
    }
  }) as RouteHandlerMethod
}

const deleteById: RouteOptions = {
  url: '/url-rewrites/:id',
  method: 'DELETE',
  schema: {
    params: idParamSchema,
    response: {
      200: selectUrlRewriteSchema,
      404: { $ref: 'httpError' }
    }
  },
  handler: (async (
    req: FastifyRequest<{ Params: IdParam; Reply: UrlRewrite }>
  ) => {
    const { drizzle: db, httpErrors } = req.server
    const id = req.params.id

    const [deleted] = await db
      .delete(urlRewrites)
      .where(eq(urlRewrites.id, id))
      .returning()
    if (!deleted) throw httpErrors.notFound('Url rewrite not found')

    return deleted
  }) as RouteHandlerMethod
}

export default [get, create, deleteById]
