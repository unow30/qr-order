import client from './client';
import { Table, CreateTableDto } from '@qr-order/shared-types';

export const getTables = (): Promise<Table[]> => client.get('/tables');
export const createTable = (dto: CreateTableDto): Promise<Table> => client.post('/tables', dto);
export const deleteTable = (id: string): Promise<void> => client.delete(`/tables/${id}`);
export const generateQrToken = (id: string): Promise<{ token: string }> => client.post(`/tables/${id}/qr`);
export const getQrToken = (id: string): Promise<{ token: string }> => client.get(`/tables/${id}/qr`);
