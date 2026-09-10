import { Module } from '@nestjs/common';
import { ThemeService } from './theme.service';

@Module({
  providers: [ThemeService],
  exports: [ThemeService],
})
export class ThemeModule {}
