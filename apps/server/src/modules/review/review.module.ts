import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewController } from '@server/modules/review/review.controller';
import { ReviewService } from '@server/modules/review/review.service';
import { ReviewEntity } from '@server/modules/review/entities/review.entity';
import { ImageModule } from '@server/modules/image/image.module';

@Module({
  imports: [TypeOrmModule.forFeature([ReviewEntity]), ImageModule],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
