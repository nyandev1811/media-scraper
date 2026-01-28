import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('scrape_history')
@Index(['user', 'sourceUrl'], { unique: true })
export class ScrapeHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  @Index() // Fast lookup for "Has this user scraped this?"
  sourceUrl: string;

  @Column({ nullable: true })
  title: string;

  @Column({ default: 0 })
  mediaCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
