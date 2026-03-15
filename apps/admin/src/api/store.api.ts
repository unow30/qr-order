import client from './client';

export interface Store {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
}

export interface AdminAccount {
  id: string;
  username: string;
  role: 'SUPER_ADMIN' | 'STORE_ADMIN';
  stores: Store[];
  isActive: boolean;
  createdAt: string;
}

export const getStores = (): Promise<Store[]> => client.get('/stores');

export const createStore = (data: { name: string; slug: string }): Promise<Store> =>
  client.post('/stores', data);

export const updateStore = (
  id: string,
  data: { name?: string; isActive?: boolean },
): Promise<Store> => client.patch(`/stores/${id}`, data);

export const deactivateStore = (id: string): Promise<void> => client.delete(`/stores/${id}`);

export const getAdmins = (): Promise<AdminAccount[]> => client.get('/admins');

export const createAdmin = (data: {
  username: string;
  password: string;
  role: 'SUPER_ADMIN' | 'STORE_ADMIN';
  storeIds?: string[];
}): Promise<AdminAccount> => client.post('/admins', data);
