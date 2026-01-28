import { Module, Global } from '@nestjs/common';
import { FilterableService } from './filterable.service';

@Global()
@Module({
  providers: [FilterableService],
  exports: [FilterableService],
})
export class CoreCommonModule {}
