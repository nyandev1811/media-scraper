import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserType } from '../core/entities/user.entity';
import { ScrapeHistory } from '../core/entities/scrape-history.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ScrapeHistory)
    private readonly historyRepository: Repository<ScrapeHistory>,
  ) {}

  async findOrCreateGuest(sessionId: string): Promise<User> {
    let user = await this.userRepository.findOne({ where: { sessionId } });
    if (!user) {
      user = this.userRepository.create({
        sessionId,
        type: UserType.GUEST,
      });
      await this.userRepository.save(user);
    }
    return user;
  }

  async recordHistory(user: User, sourceUrl: string, title: string, mediaCount: number) {
    const existing = await this.historyRepository.findOne({
      where: { user: { id: user.id }, sourceUrl },
    });

    if (existing) {
      existing.mediaCount = mediaCount;
      existing.title = title || existing.title;
      await this.historyRepository.save(existing);
    } else {
      const history = this.historyRepository.create({
        user,
        sourceUrl,
        title,
        mediaCount,
      });
      await this.historyRepository.save(history);
    }
  }

  async deleteHistory(sessionId: string, sourceUrl: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { sessionId } });
    if (!user) return;

    await this.historyRepository.delete({
      user: { id: user.id },
      sourceUrl: sourceUrl,
    });
  }

  async getUserHistory(sessionId: string) {
    const user = await this.findOrCreateGuest(sessionId);

    return this.historyRepository.find({
      where: { user: { id: user.id } },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
