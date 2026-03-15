export type AdminRole = 'SUPER_ADMIN' | 'STORE_ADMIN';

export interface Admin {
  id: string;
  username: string;
  role: AdminRole;
  storeIds?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface JwtPayload {
  sub: string;
  username: string;
  role: AdminRole;
  storeIds?: string[];
}
