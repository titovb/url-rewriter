import test, { after, afterEach, before, beforeEach, describe } from 'node:test'
import { UrlRewrite, urlRewrites } from '../../src/db-schemas'
import { FastifyInstance } from 'fastify'
import initApp from '../../src/app'
import assert from 'node:assert'
import { eq } from 'drizzle-orm'

function generateInsertUrlRewriteData(
  count = 1
): Array<Pick<UrlRewrite, 'oldUrl' | 'newUrl'>> {
  return new Array(count).fill(0).map((_, i) => ({
    oldUrl: '/old-url/' + i,
    newUrl: '/new-url/' + i
  }))
}

describe('Url rewrites API', () => {
  let app: FastifyInstance

  before(async () => {
    app = await initApp()
    await app.ready()
    await app.drizzle.delete(urlRewrites)
  })

  after(async () => {
    await app.close()
  })

  describe('GET /url-rewrites', () => {
    let dbUrlRewrites: UrlRewrite[]

    before(async () => {
      dbUrlRewrites = await app.drizzle
        .insert(urlRewrites)
        .values(generateInsertUrlRewriteData(5))
        .returning()
    })

    after(async () => {
      await app.drizzle.delete(urlRewrites)
    })

    test('should respond with url rewrites from db', async () => {
      const expected = dbUrlRewrites.map((urlRewrite) => ({
        ...urlRewrite,
        createdAt: urlRewrite.createdAt.toISOString(),
        updatedAt: urlRewrite.updatedAt.toISOString()
      }))

      const actual = await app.inject({
        method: 'GET',
        url: '/url-rewrites'
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
        url: '/url-rewrites',
        query: { limit: 'asdasd', offset: 'asdasda' }
      })

      assert.equal(actual.statusCode, 400, 'Response status should be 400')
    })

    test('should respond with url rewrites limited by query params', async () => {
      const expected = dbUrlRewrites.slice(1, 3).map((urlRewrite) => ({
        ...urlRewrite,
        createdAt: urlRewrite.createdAt.toISOString(),
        updatedAt: urlRewrite.updatedAt.toISOString()
      }))

      const actual = await app.inject({
        method: 'GET',
        url: '/url-rewrites',
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

  describe('POST /url-rewrites', () => {
    afterEach(async () => {
      await app.drizzle.delete(urlRewrites)
    })

    test('should create in db and respond with created', async () => {
      const [expected] = generateInsertUrlRewriteData()

      const actual = await app.inject({
        method: 'POST',
        url: '/url-rewrites',
        body: expected
      })

      const actualBody = actual.json()
      const [actualInDb] = await app.drizzle
        .select()
        .from(urlRewrites)
        .where(eq(urlRewrites.id, actualBody.id))

      assert.equal(actual.statusCode, 200, 'Response status should be 200')
      assert.deepStrictEqual(
        {
          oldUrl: actualBody?.oldUrl,
          newUrl: actualBody?.newUrl
        },
        expected,
        'Should respond with created'
      )
      assert.deepStrictEqual(
        {
          oldUrl: actualInDb?.oldUrl,
          newUrl: actualInDb?.newUrl
        },
        expected,
        'Should create in db'
      )
    })

    test('should respond with status code 400 when body validation failed', async () => {
      const actual = await app.inject({
        method: 'POST',
        url: '/url-rewrites'
      })

      assert.equal(actual.statusCode, 400, 'Response status should be 400')
    })

    test('should respond with status code 409 when provide url duplicate', async () => {
      const [existing] = await app.drizzle
        .insert(urlRewrites)
        .values(generateInsertUrlRewriteData())
        .returning()

      const actualExactly = await app.inject({
        method: 'POST',
        url: '/url-rewrites',
        body: {
          oldUrl: existing.oldUrl,
          newUrl: existing.newUrl
        }
      })

      const actualCross = await app.inject({
        method: 'POST',
        url: '/url-rewrites',
        body: {
          oldUrl: existing.newUrl,
          newUrl: existing.oldUrl
        }
      })

      const actualDbRecords = await app.drizzle.select().from(urlRewrites)

      assert.equal(
        actualExactly.statusCode,
        409,
        'Response status when exact urls provided should be 409'
      )
      assert.equal(
        actualCross.statusCode,
        409,
        'Response status when cross urls provided should be 409'
      )

      assert.equal(actualDbRecords.length, 1, 'Should not add to db')
    })
  })

  describe('DELETE /url-rewrites/:id', () => {
    let dbUrlRewrite: UrlRewrite

    beforeEach(async () => {
      ;[dbUrlRewrite] = await app.drizzle
        .insert(urlRewrites)
        .values(generateInsertUrlRewriteData())
        .returning()
    })

    afterEach(async () => {
      await app.drizzle.delete(urlRewrites)
    })

    test('should delete in db and respond with deleted', async () => {
      const actual = await app.inject({
        method: 'DELETE',
        url: '/url-rewrites/' + dbUrlRewrite.id
      })

      const actualBody = actual.json()
      const actualInDb = await app.drizzle
        .select()
        .from(urlRewrites)
        .where(eq(urlRewrites.id, dbUrlRewrite.id))

      assert.equal(actual.statusCode, 200, 'Response status should be 200')
      assert.deepStrictEqual(
        actualBody,
        {
          ...dbUrlRewrite,
          createdAt: dbUrlRewrite.createdAt.toISOString(),
          updatedAt: dbUrlRewrite.updatedAt.toISOString()
        },
        'Should respond with deleted'
      )
      assert.equal(actualInDb.length, 0, 'Should remove from db')
    })

    test('should respond with status code 404 when not found', async () => {
      const actual = await app.inject({
        method: 'DELETE',
        url: '/url-rewrites/' + (dbUrlRewrite.id + 1)
      })

      assert.equal(actual.statusCode, 404, 'Response status should be 404 ')
    })
  })
})
