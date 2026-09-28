import { mkdirSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import { HttpStatus, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import { AdminModule } from './admin/admin.module';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { PublicModule } from './public/public.module';

/* One Express instance serves both entry points: Vercel calls the default
   export per request, while `node dist/main.js` listens on it directly. */
const server = express();

async function bootstrap(): Promise<ConfigService> {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  server.set('trust proxy', true);
  const config = app.get(ConfigService);
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  const serverUrl = config.getOrThrow<string>('API_BASE_URL');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      /* A malformed body is 422 with field-level errors (§7.2, FR-API-4). */
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );
  app.useGlobalFilters(
    new AllExceptionsFilter(app.get(HttpAdapterHost).httpAdapter),
  );
  app.enableShutdownHooks();

  /* One document per surface, each built from its own module only, so the
     public document cannot list an admin route (SRS §2.1). */
  const publicDocument = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Portfolio API — public')
      .setDescription(
        'Unauthenticated and read-only. Published content only, resolved by slug (SRS §7.1).',
      )
      .setVersion('0.1.0')
      .addServer(serverUrl)
      .build(),
    { include: [PublicModule] },
  );
  SwaggerModule.setup('docs/public', app, publicDocument);

  if (!isProduction) {
    const adminDocument = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Portfolio API — admin')
        .setDescription(
          "API-key authenticated. Reads and writes the draft of the caller's portfolio (SRS §7.2).",
        )
        .setVersion('0.1.0')
        .addServer(serverUrl)
        .build(),
      { include: [AdminModule] },
    );
    SwaggerModule.setup('docs/admin', app, adminDocument);

    /* Written on every dev boot so the frontends can consume the contract
       without running this server. */
    const outDir = join(__dirname, '..', 'openapi');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      join(outDir, 'public.json'),
      `${JSON.stringify(publicDocument, null, 2)}\n`,
    );
    writeFileSync(
      join(outDir, 'admin.json'),
      `${JSON.stringify(adminDocument, null, 2)}\n`,
    );
  }

  await app.init();
  return config;
}

let ready: Promise<ConfigService> | undefined;

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  ready ??= bootstrap();
  await ready;
  server(req, res);
}

if (require.main === module) {
  bootstrap()
    .then((config) => {
      const port = Number(config.getOrThrow<string>('PORT'));
      server.listen(port, '0.0.0.0', () =>
        Logger.log(`Listening on http://localhost:${port}`, 'Bootstrap'),
      );
    })
    .catch((error: unknown) => {
      Logger.error(error, 'Bootstrap');
      process.exit(1);
    });
}
