import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Media } from '../core/entities/media.entity';
import { FilterableService } from '../core/common/filterable.service';
import { MediaFilterDto } from './dto/media-filter.dto';
import { UserService } from '../user/user.service';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private readonly repository: Repository<Media>,
    private readonly filterableService: FilterableService,
    private readonly userService: UserService,
  ) {}

  async save(media: Partial<Media>): Promise<Media> {
    const entity = this.repository.create(media);
    return await this.repository.save(entity);
  }

  async saveBulk(medias: Partial<Media>[]): Promise<void> {
    const entities = this.repository.create(medias);
    await this.repository.save(entities);
  }

  async findBySourceUrl(sourceUrl: string): Promise<Media[]> {
    return await this.repository.find({
      where: { sourceUrl },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteBySourceUrl(sourceUrl: string): Promise<void> {
    await this.repository.delete({ sourceUrl });
  }

  async findAll(
    filter: MediaFilterDto,
    sessionId?: string,
  ): Promise<{ data: Media[]; total: number; page: number; size: number; totalPages: number }> {
    const qb = this.repository.createQueryBuilder('media');

    if (sessionId) {
      // Find history for this user to get relevant sourceUrls
      // This is efficient because we filter only what they scraped
      const userHistory = await this.userService.getUserHistory(sessionId);
      const sourceUrls = userHistory.map((h) => h.sourceUrl);

      if (sourceUrls.length === 0) {
        // User has no history, so no media to show
        return {
          data: [],
          total: 0,
          page: filter.page || 1,
          size: filter.size || 20,
          totalPages: 0,
        };
      }

      qb.where('media.sourceUrl IN (:...sourceUrls)', { sourceUrls });
    }

    this.filterableService.apply(qb, filter, 'media', ['sourceUrl', 'url', 'title']);

    const [data, total] = await qb.getManyAndCount();
    const page = filter.page || 1;
    const size = filter.size || 20;

    return {
      data,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }
}
