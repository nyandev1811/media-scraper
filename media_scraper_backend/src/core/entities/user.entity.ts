import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export enum UserType {
  GUEST = 'GUEST',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  sessionId: string;

  @Column({
    type: 'enum',
    enum: UserType,
    default: UserType.GUEST,
  })
  type: UserType;

  @CreateDateColumn()
  createdAt: Date;
}
