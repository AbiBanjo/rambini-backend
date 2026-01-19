import { SelectQueryBuilder } from 'typeorm';

export interface Ipagination {
  page: number;
  count: number;
}

export interface IpaginationResponse<T = any> {
  documents: T[];
  meta: {
    currrentPage: number;
    perPage: number;
    totalDocuments: number;
    totalPages: number;
  };
}

export async function fetchPage<T>(
  qb: SelectQueryBuilder<T>,
  pagination: Ipagination,
): Promise<IpaginationResponse<T>> {
  const { page, count } = pagination;

  const skip = (page - 1) * count;
  const take = count;

  const [documents, totalDocuments] = await qb
    .skip(skip)
    .take(take)
    .getManyAndCount();

  const totalPages = Math.ceil(totalDocuments / count);
  return {
    documents,
    meta: {
      currrentPage: page,
      perPage: count,
      totalDocuments,
      totalPages,
    },
  };
}
