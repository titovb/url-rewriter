import { Ajv } from 'ajv'
import { Static, Type } from '@sinclair/typebox'

const ConfigSchema = Type.Object(
  {
    node_env: Type.Union([
      Type.Literal('development'),
      Type.Literal('production'),
      Type.Literal('test')
    ]),
    ip: Type.String(),
    port: Type.Number(),
    db_url: Type.String(),
  },
  { additionalProperties: true }
)
export type Config = Static<typeof ConfigSchema>

function loadConfig(): Record<string, unknown> {
  return objKeysToLowerCase(process.env)
}

function objKeysToLowerCase(
  obj: Record<string, unknown>
): Record<string, unknown> {
  return Object.entries(obj).reduce(
    (acc, [key, val]) => {
      acc[key.toLowerCase()] = val
      return acc
    },
    {} as Record<string, unknown>
  )
}

function validateConfig(rawConfig: Record<string, unknown>): Config | never {
  const ajv = new Ajv({
    allErrors: true,
    useDefaults: true,
    coerceTypes: true
  })
  const validate = ajv.compile(ConfigSchema)

  const isValid = validate(rawConfig)
  if (!isValid) {
    throw new Error(
      'Cant parse env: ' + JSON.stringify(validate.errors, null, 2)
    )
  }

  return rawConfig as Config
}

export const config = validateConfig(loadConfig())
