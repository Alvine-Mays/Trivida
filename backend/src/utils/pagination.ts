import { FilterQuery, Model, Document } from 'mongoose';

export type Cursor = { createdAt: string; _id: string };

export function encodeCursor(c: Cursor) {
  return Buffer.from(JSON.stringify(c)).toString('base64');
}

export function decodeCursor(s?: string): Cursor | null {
  if (!s) return null;
  try {
    return JSON.parse(Buffer.from(s, 'base64').toString('utf8')) as Cursor;
  } catch {
    return null;
  }
}

export async function pagedList<T extends Document>(model: Model<T>, filter: FilterQuery<T>, limit: number, cursorStr?: string) {
  const cursor = decodeCursor(cursorStr || undefined);
  const query: any = { ...filter };
  if (cursor) query.$or = [{ createdAt: { $lt: new Date(cursor.createdAt) } }, { createdAt: new Date(cursor.createdAt), _id: { $lt: cursor._id } }];
  const items = await model.find(query).sort({ createdAt: -1, _id: -1 }).limit(limit + 1);
  let nextCursor: string | undefined;
  if (items.length > limit) {
    const last = items[limit - 1];
    nextCursor = encodeCursor({ createdAt: (last as any).createdAt.toISOString(), _id: String(last._id) });
    items.pop();
  }
  return { items, nextCursor };
}
