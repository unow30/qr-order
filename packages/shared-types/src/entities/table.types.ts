export interface Table {
  id: string;
  storeId: string;
  tableNumber: number;
  name: string;
  capacity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface QrToken {
  id: string;
  tableId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface CreateTableDto {
  tableNumber: number;
  name: string;
  capacity?: number;
}
