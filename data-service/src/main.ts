import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AdminModule } from './admin/admin.module';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { PublicModule } from './public/public.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  const serverUrl = config.getOrThrow<string>('API_BASE_URL');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
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
          "Session-authenticated. Reads and writes the draft of the session's portfolio (SRS §7.2).",
        )
        .setVersion('0.1.0')
        .addServer(serverUrl)
        .addCookieAuth('session')
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

  await app.listen(config.getOrThrow<string>('PORT'));
}

void bootstrap();
