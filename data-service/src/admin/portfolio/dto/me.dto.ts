import { ApiProperty } from '@nestjs/swagger';
import {
  AUTH_PROVIDERS,
  type AuthProvider,
} from '../../../schemas/user.schema';

export class MeDto {
  @ApiProperty({ enum: [...AUTH_PROVIDERS], required: true, example: 'github' })
  provider: AuthProvider;

  @ApiProperty({ type: String, required: true, example: 'alice@example.com' })
  email: string;

  @ApiProperty({ type: String, required: true, example: 'Alice Doe' })
  displayName: string;

  @ApiProperty({
    type: String,
    required: false,
    example: 'https://avatars.githubusercontent.com/u/1',
  })
  avatarUrl?: string;
}
