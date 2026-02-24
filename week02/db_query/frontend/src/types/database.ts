export interface DatabaseConnection {
  name: string;
  connectionUrl: string;
  createdAt: string;
  updatedAt: string;
  tableCount: number;
  viewCount: number;
}

export interface DatabaseConnectionCreate {
  url: string;
}

export interface DatabaseConnectionListResponse {
  data: DatabaseConnection[];
}
