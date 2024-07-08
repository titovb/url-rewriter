import { config } from './core'
import initApp from './app'

initApp()
  .then((app) => app.listen({ port: config.port, host: config.ip }))
  .catch(console.error)
