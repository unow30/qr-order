import client from '@web/api/client';
import { EntityImage } from '@qr-order/shared-types';

export const getStoreActiveImages = (storeId: string): Promise<EntityImage[]> =>
  client.get(`/images/stores/${storeId}/active`);
