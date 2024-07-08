import test, { after, before, describe } from 'node:test'
import { UrlRewrite, urlRewrites } from '../../src/db-schemas'
import Fastify, { FastifyInstance } from 'fastify'
import drizzle from '../../src/plugins/drizzle'
import { config } from '../../src/core'
import urlRewriteChecker from '../../src/plugins/url-rewrite-checker'
import { Static, Type } from '@sinclair/typebox'
import sensible, { HttpErrorCodes } from '@fastify/sensible'
import assert from 'node:assert'
import * as url from 'node:url'

describe('Url rewriter checker plugin', () => {
  let app: FastifyInstance
  let dbEntitiesUrlRewrite: UrlRewrite
  let dbEntitiesByIdUrlRewrite: UrlRewrite

  before(async () => {
    app = Fastify()

    await app.register(sensible)
    await app.register(drizzle, {
      pgClient: {
        host: config.db_host,
        port: config.db_port,
        user: config.db_user,
        password: config.db_password,
        database: config.db_name
      },
      drizzle: {}
    })
    await app.register(urlRewriteChecker)

    const anyQuerySchema = Type.Object({}, { additionalProperties: true })
    app.get<{ Querystring: Static<typeof anyQuerySchema> }>(
      '/entities',
      { schema: { querystring: anyQuerySchema } },
      (req, reply) => {
        const query = req.query
        return reply.code(200).send({ query })
      }
    )

    const codeParamSchema = Type.Object({ statusCode: Type.Number() })
    app.get<{ Params: Static<typeof codeParamSchema> }>(
      '/entities/:statusCode',
      { schema: { params: codeParamSchema } },
      (req, reply) => {
        const code = req.params.statusCode
        if (code >= 400)
          throw req.server.httpErrors.getHttpError(code as HttpErrorCodes)
        return reply.code(code).send()
      }
    )

    await app.ready()

    await app.drizzle.delete(urlRewrites)
    ;[dbEntitiesUrlRewrite] = await app.drizzle
      .insert(urlRewrites)
      .values({ oldUrl: '/old-entities', newUrl: '/entities' })
      .returning()
    ;[dbEntitiesByIdUrlRewrite] = await app.drizzle
      .insert(urlRewrites)
      .values({ oldUrl: '/entities/404', newUrl: '/entities/200' })
      .returning()
  })

  after(async () => {
    await app.drizzle.delete(urlRewrites)
    await app.close()
  })

  test('should reply with 404 when http method is not GET', async () => {
    const actual = await app.inject({
      method: 'DELETE',
      url: dbEntitiesUrlRewrite.oldUrl
    })

    assert.equal(actual.statusCode, 404)
  })

  test('should redirect using existing rewrite when endpoint doesnt exist', async () => {
    const actual = await app.inject({
      method: 'GET',
      url: dbEntitiesUrlRewrite.oldUrl
    })

    assert.equal(actual.statusCode, 301, 'Response status should be 301')
    assert.equal(
      actual.headers.location,
      dbEntitiesUrlRewrite.newUrl,
      'Location should eq existing newUrl'
    )
  })

  test('should reply with 404 when endpoint and rewrite doesnt exist', async () => {
    const actual = await app.inject({
      method: 'GET',
      url: '/smth'
    })

    assert.equal(actual.statusCode, 404, 'Response status should be 404')
  })

  test('should redirect using existing rewrite when endpoint throw not found', async () => {
    const actual = await app.inject({
      method: 'GET',
      url: dbEntitiesByIdUrlRewrite.oldUrl
    })

    assert.equal(actual.statusCode, 301, 'Response status should be 301')
    assert.equal(
      actual.headers.location,
      dbEntitiesByIdUrlRewrite.newUrl,
      'Location should eq existing newUrl'
    )
  })

  test('should reply with error when endpoint throw', async () => {
    const expectedStatus = 409
    const actual = await app.inject({
      method: 'GET',
      url: '/entities/' + expectedStatus
    })

    assert.equal(
      actual.statusCode,
      expectedStatus,
      'Response status is not fit to thrown error'
    )
  })

  test('should handle query params', async () => {
    const expectedQuery = { field1: 'field1', field2: 'field2' }

    const actual = await app.inject({
      method: 'GET',
      url: dbEntitiesUrlRewrite.oldUrl,
      query: expectedQuery
    })

    const { query: actualLocationQuery, pathname: actualLocation } = url.parse(
      actual.headers.location || '',
      true
    )

    assert.equal(actual.statusCode, 301, 'Response status should be 301')
    assert.equal(
      actualLocation,
      dbEntitiesUrlRewrite.newUrl,
      'Location should eq existing newUrl'
    )
    assert.deepEqual(
      actualLocationQuery,
      expectedQuery,
      'Should attach provided query to location url'
    )
  })
})
