import fastify from 'fastify'
import { config, loggerOpts, registerPlugins } from './core'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import routes from './routes'
import ajvFormats from 'ajv-formats'

export default async function initApp() {
  const app = fastify({
    logger: loggerOpts[config.node_env],
    ajv: {
      plugins: [[ajvFormats, { mode: 'full' }]]
    }
  }).withTypeProvider<TypeBoxTypeProvider>()

  await registerPlugins(app, config)
  routes.forEach((route) => app.route(route))

  process.on('SIGTERM', () => app.close())

  return app
}
