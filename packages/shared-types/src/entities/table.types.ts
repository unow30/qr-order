export interface Table {
  id: string;
  storeId: string;
  tableNumber: number;
  name: string;
  capacity: number;
  isActive: boolean;
  qrToken: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTableDto {
  tableNumber: number;
  name: string;
  capacity?: number;
}
