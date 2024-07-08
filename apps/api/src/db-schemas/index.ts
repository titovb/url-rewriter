import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { Static, Type } from '@sinclair/typebox'
import { createSelectSchema } from 'drizzle-typebox'

const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
})
const selectProductSchema = createSelectSchema(products, {
  createdAt: Type.Unsafe<Date>({ type: 'string', format: 'date-time' }),
  updatedAt: Type.Unsafe<Date>({ type: 'string', format: 'date-time' })
})
export type Product = Static<typeof selectProductSchema>

const urlRewrites = pgTable('url_rewrites', {
  id: serial('id').primaryKey(),
  oldUrl: text('old_url').notNull().unique(),
  newUrl: text('new_url').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
})
const selectUrlRewriteSchema = createSelectSchema(urlRewrites, {
  createdAt: Type.Unsafe<Date>({ type: 'string', format: 'date-time' }),
  updatedAt: Type.Unsafe<Date>({ type: 'string', format: 'date-time' })
})
export type UrlRewrite = Static<typeof selectUrlRewriteSchema>

export { products, selectProductSchema, urlRewrites, selectUrlRewriteSchema }
