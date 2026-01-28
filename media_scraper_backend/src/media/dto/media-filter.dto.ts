import { IsOptional, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { BaseFilterDto } from '../../core/common/base-filter.dto';
import { MediaType } from '../../core/entities/media.entity';

export class MediaFilterDto extends BaseFilterDto {
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(MediaType)
  type?: MediaType;
}
