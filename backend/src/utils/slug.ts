import { Model } from 'mongoose';
import { config } from '../config.js';

export function toKebab(s: string) {
  return s.normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').replace(/_+/g, '-').toLowerCase();
}

export async function uniqueSlug<T extends { slug: string }>(model: Model<any>, title: string) {
  let base = toKebab(title);
  if (config.reservedSlugs.includes(base)) base = `${base}-item`;
  let slug = base;
  let i = 0;
  while (await model.exists({ slug })) {
    i += 1;
    slug = `${base}-${i}`;
  }
  return slug;
}
