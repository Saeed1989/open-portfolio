import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { Portfolio } from './portfolio.schema';

/** SRS §5.7. */
@Schema({ collection: 'auditLog' })
export class AuditLog {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Portfolio.name,
    required: true,
  })
  portfolioId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop()
  action: string;

  @Prop()
  targetPath: string;

  @Prop()
  timestamp: Date;

  @Prop()
  ipHash: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
