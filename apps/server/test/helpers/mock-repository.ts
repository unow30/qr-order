import { ObjectLiteral, Repository } from 'typeorm';

export type MockRepository<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

export function createMockRepository<T extends ObjectLiteral>(): MockRepository<T> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findBy: jest.fn(),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    create: jest.fn().mockImplementation((dto) => dto),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    count: jest.fn(),
    increment: jest.fn(),
    remove: jest.fn(),
  };
}
