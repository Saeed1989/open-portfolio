import { Inject, Injectable, NotImplementedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  STORAGE_SIGNER,
  StorageSigner,
} from '../../external/storage-signer/storage-signer';
import { Media } from '../../schemas/media.schema';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { UploadUrlDto } from './dto/upload-url.dto';

@Injectable()
export class MediaService {
  constructor(
    @InjectModel(Media.name) private readonly media: Model<Media>,
    @Inject(STORAGE_SIGNER) private readonly signer: StorageSigner,
  ) {}

  createUploadUrl(
    portfolioId: string,
    dto: CreateUploadUrlDto,
  ): Promise<UploadUrlDto> {
    throw new NotImplementedException();
  }

  remove(portfolioId: string, id: string): Promise<void> {
    throw new NotImplementedException();
  }
}
