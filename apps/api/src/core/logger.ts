import { FastifyLoggerOptions, PinoLoggerOptions } from 'fastify/types/logger'
import { Config } from './config'

export type LoggerOpts = Record<
  Config['node_env'],
  boolean | (FastifyLoggerOptions & PinoLoggerOptions)
>

export const loggerOpts: LoggerOpts = {
  development: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  },
  production: true,
  test: false
}
