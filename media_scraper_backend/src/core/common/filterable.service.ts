import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder, Brackets, ObjectLiteral } from 'typeorm';
import { BaseFilterDto } from './base-filter.dto';
import { getStartDate, getEndDate } from './utils';

@Injectable()
export class FilterableService {
  apply<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    dto: BaseFilterDto,
    alias: string,
    searchFields: string[] = [],
  ): SelectQueryBuilder<T> {
    const { page = 1, size = 20, startTime, endTime, search, ...filters } = dto;

    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;

      const hasColumn = qb.connection
        .getMetadata(qb.alias)
        .columns.some((c) => c.propertyName === key);

      if (hasColumn) {
        if (Array.isArray(value)) {
          qb.andWhere(`${alias}.${key} IN (:...${key})`, { [key]: value });
        } else {
          qb.andWhere(`${alias}.${key} = :${key}`, { [key]: value });
        }
      }
    });

    if (startTime || endTime) {
      if (startTime) {
        const start = getStartDate(startTime);
        qb.andWhere(`${alias}.createdAt >= :start`, { start });
      }
      if (endTime) {
        const end = getEndDate(endTime);
        qb.andWhere(`${alias}.createdAt <= :end`, { end });
      }
    }

    if (search && searchFields.length > 0) {
      qb.andWhere(
        new Brackets((inner) => {
          searchFields.forEach((field) => {
            const column = field.includes('.') ? field : `${alias}.${field}`;
            inner.orWhere(`${column} ILIKE :search`, { search: `%${search}%` });
          });
        }),
      );
    }

    qb.skip((page - 1) * size).take(size);
    qb.orderBy(`${alias}.createdAt`, 'DESC');

    return qb;
  }
}
