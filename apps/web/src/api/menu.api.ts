import client from '@web/api/client';
import { MenuCategory } from '@qr-order/shared-types';

export const getMenu = (): Promise<MenuCategory[]> => client.get('/menu');
