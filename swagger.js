import fs from 'fs'
import path from 'path'

/**
 * Generate OpenAPI spec dari semua router/plugin
 * @param {string} routersDir - Path ke folder routers
 * @returns {object} - OpenAPI spec
 */
export function generateOpenAPISpec(routersDir = path.join(process.cwd(), 'routers')) {
  const openapi = {
    openapi: '3.0.0',
    info: {
      title: "Open's API",
      version: '1.0.0',
      description: 'Auto-generated from routers plugins',
    },
    servers: [
      { url: '/', description: 'Current server' }
    ],
    paths: {}
  }

  function collectRoutes(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        collectRoutes(entryPath)
      } else if (entry.name.endsWith('.js')) {
        let routeFile
        try {
          routeFile = require(entryPath)
        } catch {
          // fallback for ESM if run as .mjs or with ESM loader
          routeFile = (await import(entryPath)).default
        }
        let routesArr = []
        if (Array.isArray(routeFile.routes)) {
          routesArr = routeFile.routes
        } else if (routeFile.routes) {
          routesArr = [routeFile.routes]
        } else if (routeFile.default) {
          routesArr = [routeFile.default]
        } else if (routeFile.path) {
          routesArr = [routeFile]
        }
        for (const route of routesArr) {
          if (!route || !route.path) continue
          const method = (route.method || 'get').toLowerCase()
          if (!openapi.paths[route.path]) openapi.paths[route.path] = {}

          // Handle parameters for GET (query) and POST (requestBody)
          let parameters = []
          let requestBody = undefined
          if (method === 'get') {
            parameters = (route.parameter || []).map(param => ({
              name: param,
              in: 'query',
              schema: { type: 'string' },
              required: false
            }))
          } else if (method === 'post') {
            // Assume parameters are in requestBody as application/json
            requestBody = {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: Object.fromEntries(
                      (route.parameter || []).map(param => [
                        param,
                        { type: 'string' }
                      ])
                    )
                  }
                }
              }
            }
          }

          openapi.paths[route.path][method] = {
            tags: [route.category || 'default'],
            summary: route.path,
            ...(parameters.length > 0 ? { parameters } : {}),
            ...(requestBody ? { requestBody } : {}),
            responses: {
              '200': { description: 'OK' }
            }
          }
        }
      }
    }
  }

  collectRoutes(routersDir)
  return openapi
}