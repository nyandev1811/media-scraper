import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ScrapeRequestDto {
  @ApiProperty({
    description: 'Array of URLs to scrape',
    example: ['https://google.com', 'https://react.dev'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  urls: string[];

  @ApiProperty({
    description: 'Session ID for guest user tracking',
    example: 'guest-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  sessionId?: string;
}
