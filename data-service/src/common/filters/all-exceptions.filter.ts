import { Catch } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

/**
 * The global exception filter. For now it defers to Nest's default response
 * and logging; the shared field-level error shape is to be built here.
 */
@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {}
