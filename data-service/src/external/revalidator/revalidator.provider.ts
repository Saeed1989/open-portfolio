import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NoopRevalidator } from './noop-revalidator';
import { REVALIDATOR, Revalidator } from './revalidator';

/** Selects the implementation from REVALIDATE_MODE. */
export const revalidatorProvider: FactoryProvider<Revalidator> = {
  provide: REVALIDATOR,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Revalidator => {
    const mode = config.getOrThrow<string>('REVALIDATE_MODE');
    if (mode === 'noop') return new NoopRevalidator();
    throw new Error(`REVALIDATE_MODE=${mode} is not implemented`);
  },
};
