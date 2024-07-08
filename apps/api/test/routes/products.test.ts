import { FastifyInstance } from 'fastify'
import initApp from '../../src/app'
import { Product, products } from '../../src/db-schemas'
import test, { after, afterEach, before, beforeEach, describe } from 'node:test'
import assert from 'node:assert'
import { eq } from 'drizzle-orm'

function generateInsertProductData(
  count = 1
): Array<Pick<Product, 'name' | 'slug'>> {
  return new Array(count).fill(0).map((_, i) => ({
    name: 'Product ' + i,
    slug: 'product-' + i
  }))
}

describe('Products API', () => {
  let app: FastifyInstance

  before(async () => {
    app = await initApp()
    await app.ready()
    await app.drizzle.delete(products)
  })

  after(async () => {
    await app.close()
  })

  describe('GET /products', () => {
    let dbProducts: Product[]

    before(async () => {
      dbProducts = await app.drizzle
        .insert(products)
        .values(generateInsertProductData(5))
        .returning()
    })

    after(async () => {
      await app.drizzle.delete(products)
    })

    test('should respond with products from db', async () => {
      const expected = dbProducts.map((product) => ({
        ...product,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString()
      }))

      const actual = await app.inject({
        method: 'GET',
        url: '/products'
      })

      assert.equal(actual.statusCode, 200, 'Response status should be 200')
      assert.deepStrictEqual(
        actual.json(),
        expected,
        'Should respond with data from db'
      )
    })

    test('should respond with status code 400 when query params validation failed', async () => {
      const actual = await app.inject({
        method: 'GET',
        url: '/products',
        query: { limit: 'asdasd', offset: 'asdasda' }
      })

      assert.equal(actual.statusCode, 400, 'Response status should be 400')
    })

    test('should respond with products limited by query params', async () => {
      const expected = dbProducts.slice(1, 3).map((product) => ({
        ...product,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString()
      }))

      const actual = await app.inject({
        method: 'GET',
        url: '/products',
        query: { limit: '2', offset: '1' }
      })

      assert.equal(actual.statusCode, 200, 'Response status should be 200')
      assert.deepStrictEqual(
        actual.json(),
        expected,
        'Should respond with paginated data from db'
      )
    })
  })

  describe('GET /products/:slug', () => {
    let dbProduct: Product

    before(async () => {
      ;[dbProduct] = await app.drizzle
        .insert(products)
        .values(generateInsertProductData())
        .returning()
    })

    after(async () => {
      await app.drizzle.delete(products)
    })

    test('should respond with product from db', async () => {
      const expected = {
        ...dbProduct,
        createdAt: dbProduct.createdAt.toISOString(),
        updatedAt: dbProduct.updatedAt.toISOString()
      }

      const actual = await app.inject({
        method: 'GET',
        url: '/products/' + expected.slug
      })

      assert.equal(actual.statusCode, 200, 'Response status should be 200')
      assert.deepStrictEqual(
        actual.json(),
        expected,
        'Should respond with data from db'
      )
    })

    test('should respond with status code 404 when not found', async () => {
      const actual = await app.inject({
        method: 'GET',
        url: '/products/' + 'pseudo_slug'
      })

      assert.equal(actual.statusCode, 404, 'Response status should be 404')
    })
  })

  describe('POST /products', () => {
    afterEach(async () => {
      await app.drizzle.delete(products)
    })

    test('should create in db and respond with created', async () => {
      const expected = {
        name: 'Product',
        description: 'Description'
      }

      const actual = await app.inject({
        method: 'POST',
        url: '/products',
        body: expected
      })

      const actualBody = actual.json()
      const [actualInDb] = await app.drizzle
        .select()
        .from(products)
        .where(eq(products.id, actualBody.id))

      assert.equal(actual.statusCode, 200, 'Response status should be 200')
      assert.deepStrictEqual(
        {
          name: actualBody?.name,
          slug: actualBody?.slug,
          description: actualBody?.description
        },
        {
          ...expected,
          slug: expected.name.toLowerCase()
        },
        'Should respond with created'
      )
      assert.deepStrictEqual(
        {
          name: actualInDb?.name,
          slug: actualInDb?.slug,
          description: actualInDb?.description
        },
        {
          ...expected,
          slug: expected.name.toLowerCase()
        },
        'Should create in db'
      )
    })

    test('should create without description in db and respond with created', async () => {
      const expected = {
        name: 'Product'
      }

      const actual = await app.inject({
        method: 'POST',
        url: '/products',
        body: expected
      })

      const actualBody = actual.json()
      const [actualInDb] = await app.drizzle
        .select()
        .from(products)
        .where(eq(products.id, actualBody.id))

      assert.equal(actual.statusCode, 200, 'Response status should be 200')
      assert.deepStrictEqual(
        {
          name: actualBody?.name,
          slug: actualBody?.slug
        },
        {
          ...expected,
          slug: expected.name.toLowerCase()
        },
        'Should respond with created'
      )
      assert.deepStrictEqual(
        {
          name: actualInDb?.name,
          slug: actualInDb?.slug
        },
        {
          ...expected,
          slug: expected.name.toLowerCase()
        },
        'Should create in db'
      )
    })

    test('should respond with status code 400 when body validation failed', async () => {
      const actual = await app.inject({
        method: 'POST',
        url: '/products'
      })

      assert.equal(actual.statusCode, 400, 'Response status should be 400')
    })

    test('should respond with status code 409 when provide slug duplicate', async () => {
      const [existing] = await app.drizzle
        .insert(products)
        .values(generateInsertProductData())
        .returning()

      const actual = await app.inject({
        method: 'POST',
        url: '/products',
        body: {
          name: existing.name
        }
      })

      const actualDbRecords = await app.drizzle.select().from(products)

      assert.equal(actual.statusCode, 409, 'Response status should be 409')
      assert.equal(actualDbRecords.length, 1, 'Should not add to db')
    })
  })

  describe('PATCH /products/:slug', () => {
    let dbProduct: Product

    beforeEach(async () => {
      ;[dbProduct] = await app.drizzle
        .insert(products)
        .values(generateInsertProductData())
        .returning()
    })

    afterEach(async () => {
      await app.drizzle.delete(products)
    })

    test('should update in db and respond with updated', async () => {
      const expected = {
        name: 'Updated product',
        description: 'Updated product description'
      }

      const actual = await app.inject({
        method: 'PATCH',
        url: '/products/' + dbProduct.slug,
        body: expected
      })

      const actualBody = actual.json()
      const [actualInDb] = await app.drizzle
        .select()
        .from(products)
        .where(eq(products.id, dbProduct.id))

      assert.equal(actual.statusCode, 200, 'Response status should be 200')
      assert.deepStrictEqual(
        {
          name: actualBody?.name,
          slug: actualBody?.slug,
          description: actualBody?.description
        },
        {
          ...expected,
          slug: 'updated-product'
        },
        'Should respond with updated'
      )
      assert.deepStrictEqual(
        {
          name: actualInDb?.name,
          slug: actualInDb?.slug,
          description: actualInDb?.description
        },
        {
          ...expected,
          slug: 'updated-product'
        },
        'Should update in db'
      )
    })

    test('should respond with status code 404 when not found', async () => {
      const actual = await app.inject({
        method: 'PATCH',
        url: '/products/' + 'pseudo-slug',
        body: {
          name: 'Updated product'
        }
      })

      assert.equal(actual.statusCode, 404, 'Response status should be 404 ')
    })

    test('should respond with status code 409 when provide slug duplicate', async () => {
      const [duplicate] = await app.drizzle
        .insert(products)
        .values({ name: 'Product 1', slug: 'product-1' })
        .returning()

      const actual = await app.inject({
        method: 'PATCH',
        url: '/products/' + dbProduct.slug,
        body: {
          name: duplicate.name
        }
      })

      const [actualDbRecord] = await app.drizzle
        .select()
        .from(products)
        .where(eq(products.id, dbProduct.id))

      assert.equal(actual.statusCode, 409, 'Response status should be 409')
      assert.deepStrictEqual(
        actualDbRecord,
        dbProduct,
        'Should not update in db'
      )
    })
  })

  describe('DELETE /products/:slug', () => {
    let dbProduct: Product

    beforeEach(async () => {
      ;[dbProduct] = await app.drizzle
        .insert(products)
        .values(generateInsertProductData())
        .returning()
    })

    afterEach(async () => {
      await app.drizzle.delete(products)
    })

    test('should delete in db and respond with deleted', async () => {
      const actual = await app.inject({
        method: 'DELETE',
        url: '/products/' + dbProduct.slug
      })

      const actualBody = actual.json()
      const actualInDb = await app.drizzle
        .select()
        .from(products)
        .where(eq(products.id, dbProduct.id))

      assert.equal(actual.statusCode, 200, 'Response status should be 200')
      assert.deepStrictEqual(
        actualBody,
        {
          ...dbProduct,
          createdAt: dbProduct.createdAt.toISOString(),
          updatedAt: dbProduct.updatedAt.toISOString()
        },
        'Should respond with deleted'
      )
      assert.equal(actualInDb.length, 0, 'Should remove from db')
    })

    test('should respond with status code 404 when not found', async () => {
      const actual = await app.inject({
        method: 'DELETE',
        url: '/products/' + 'pseudo-slug'
      })

      assert.equal(actual.statusCode, 404, 'Response status should be 404 ')
    })
  })
})
