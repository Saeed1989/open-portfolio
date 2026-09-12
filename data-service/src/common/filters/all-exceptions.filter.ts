import { Catch } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

/**
 * The global exception filter. For now it defers to Nest's default response
 * and logging; the field-level error shape FR-API-4 and FR-PUB-6 need is
 * built here once validation exists.
 */
@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {}
