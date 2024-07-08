import { Static, Type } from '@sinclair/typebox'

export const paginationSchema = Type.Object({
  limit: Type.Optional(Type.Number()),
  offset: Type.Optional(Type.Number())
})

export type Pagination = Static<typeof paginationSchema>

export const createProductSchema = Type.Object({
  name: Type.String(),
  description: Type.Optional(Type.String())
})
export type CreateProduct = Static<typeof createProductSchema>

export const updateProductSchema = Type.Object({
  name: Type.Optional(Type.String()),
  description: Type.Optional(Type.String())
})
export type UpdateProduct = Static<typeof updateProductSchema>

export const createUrlRewriteSchema = Type.Object({
  oldUrl: Type.String({ format: 'uri-reference' }),
  newUrl: Type.String({ format: 'uri-reference' })
})
export type CreateUrlRewrite = Static<typeof createUrlRewriteSchema>
