import { FastifyRequest, RouteHandlerMethod, RouteOptions } from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { Product, products, selectProductSchema } from '../db-schemas'
import { eq } from 'drizzle-orm'
import {
  CreateProduct,
  createProductSchema,
  UpdateProduct,
  Pagination,
  paginationSchema
} from '../dto'
import slugify from 'slugify'
import { handleDbDuplicateError } from '../core'

const slugParamSchema = Type.Object({
  slug: Type.String()
})
type SlugParam = Static<typeof slugParamSchema>

const get: RouteOptions = {
  url: '/products',
  method: 'GET',
  schema: {
    querystring: paginationSchema,
    response: {
      200: Type.Array(selectProductSchema)
    }
  },
  handler: (async (
    req: FastifyRequest<{ Querystring: Pagination; Reply: Product[] }>
  ) => {
    const { drizzle: db } = req.server
    const { offset, limit } = req.query

    const query = db.select().from(products)
    if (offset != null) query.offset(offset)
    if (limit != null) query.limit(limit)

    return query
  }) as RouteHandlerMethod
}

const getBySlug: RouteOptions = {
  url: '/products/:slug',
  method: 'GET',
  schema: {
    params: slugParamSchema,
    response: {
      200: selectProductSchema,
      404: { $ref: 'httpError' }
    }
  },
  handler: (async (
    req: FastifyRequest<{ Params: SlugParam; Reply: Product }>
  ) => {
    const { drizzle: db, httpErrors } = req.server
    const slug = req.params.slug

    const [found] = await db
      .select()
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1)
    if (!found) throw httpErrors.notFound()

    return found
  }) as RouteHandlerMethod
}

const create: RouteOptions = {
  url: '/products',
  method: 'POST',
  schema: {
    body: createProductSchema,
    response: {
      200: selectProductSchema,
      400: { $ref: 'httpError' },
      409: { $ref: 'httpError' }
    }
  },
  handler: (async (
    req: FastifyRequest<{ Body: CreateProduct; Reply: Product }>
  ) => {
    const { drizzle: db, httpErrors } = req.server
    const dto = req.body

    const slug = slugify(dto.name, {
      lower: true,
      strict: true
    })

    try {
      const [created] = await db
        .insert(products)
        .values({ ...dto, slug })
        .returning()
      return created
    } catch (error) {
      handleDbDuplicateError(
        error,
        httpErrors.conflict('Product with such name already exist')
      )
      throw error
    }
  }) as RouteHandlerMethod
}

const updateBySlug: RouteOptions = {
  url: '/products/:slug',
  method: 'PATCH',
  schema: {
    params: slugParamSchema,
    response: {
      200: selectProductSchema,
      400: { $ref: 'httpError' },
      404: { $ref: 'httpError' },
      409: { $ref: 'httpError' }
    }
  },
  handler: (async (
    req: FastifyRequest<{
      Params: SlugParam
      Body: UpdateProduct
      Reply: Product
    }>
  ) => {
    const { drizzle: db, httpErrors } = req.server
    const slug = req.params.slug
    const dto = req.body
    const update: Partial<Product> = dto

    if (dto.name) {
      update.slug = slugify(dto.name, {
        lower: true,
        strict: true
      })
    }

    let updated
    try {
      ;[updated] = await db
        .update(products)
        .set(update)
        .where(eq(products.slug, slug))
        .returning()
    } catch (error) {
      handleDbDuplicateError(
        error,
        httpErrors.conflict('Product with such name already exist')
      )
      throw error
    }

    if (!updated) throw httpErrors.notFound()
    return updated
  }) as RouteHandlerMethod
}

const deleteBySlug: RouteOptions = {
  url: '/products/:slug',
  method: 'DELETE',
  schema: {
    params: slugParamSchema,
    response: {
      200: selectProductSchema,
      404: { $ref: 'httpError' }
    }
  },
  handler: (async (
    req: FastifyRequest<{ Params: SlugParam; Reply: Product }>
  ) => {
    const { drizzle: db, httpErrors } = req.server
    const slug = req.params.slug

    const [deleted] = await db
      .delete(products)
      .where(eq(products.slug, slug))
      .returning()
    if (!deleted) throw httpErrors.notFound('Product not found')

    return deleted
  }) as RouteHandlerMethod
}

export default [get, getBySlug, updateBySlug, deleteBySlug, create]
