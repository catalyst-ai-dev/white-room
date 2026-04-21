import type { DataSource } from 'typeorm';
import type { FastifyInstance } from 'fastify';

import Fastify from 'fastify';
import * as path from 'path';
import AutoLoad from '@fastify/autoload';
import cors from '@fastify/cors';
import { DomainModule } from '@domain';
import { webSwaggerUiPlugin } from './plugins/swaggerUI';

export type AppOptions = {
  domain: DomainModule;
  corsOrigin?: string;
};

export type ServerOptions = {
  dataSource: DataSource;
  corsOrigin?: string;
};

/**
 * Main Fastify application.
 *
 * This function registers the API routes, loads the plugins in the ./plugins folder,
 * and decorates the Fastify instances with the domain module.
 *
 * @param fastify - The Fastify instance to configure
 * @param {AppOptions} opts - Configuration options for the application
 * @param {DomainModule} opts.domain - Domain module to be used by the application
 * @param {string} [opts.corsOrigin] - Optional CORS origin URL to allow cross-origin requests
 */
export function app(fastify: FastifyInstance, opts: AppOptions) {
  if (opts.corsOrigin) {
    fastify.register(cors, {
      origin: opts.corsOrigin,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
    });
  }

  // Add the domain module to the Fastify instance
  fastify.decorate('domain', opts.domain);

  // Load all plugins defined in ./plugins, except the Swagger UI plugin
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    ignorePattern: /\.spec\.ts$/,
  });

  // Load routes
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'controllers'),
    options: {
      domain: opts.domain,
    },
    ignorePattern: /\.spec\.ts$/,
  });

  // Load Swagger Docs UIs
  fastify.register(webSwaggerUiPlugin);

  // Health route
  fastify.route({
    method: 'GET',
    url: '/health',
    handler: () => {
      return { status: 'ok' };
    },
  });
}

/**
 * Factory class for creating configured Fastify server instances.
 *
 * The create() method initializes a new Fastify server with the provided options,
 * sets up the domain module using the data source, and registers the main application
 * which includes routes, plugins and APIs.
 *
 * @param {ServerOptions} opts - The options for the server
 * @param {DataSource} opts.dataSource - The TypeORM data source for database connections
 * @param {string} [opts.corsOrigin] - Optional CORS origin URL to allow cross-origin requests
 * @returns {Promise<FastifyInstance>} Fastify server instance
 */
export class AppFactory {
  static create(opts: ServerOptions): FastifyInstance {
    const domain = new DomainModule(opts.dataSource);

    const fastifyServer = Fastify({
      logger: false,
      trustProxy: true,
    });

    fastifyServer.register(app, {
      domain,
      corsOrigin: opts.corsOrigin,
    });

    return fastifyServer;
  }
}
