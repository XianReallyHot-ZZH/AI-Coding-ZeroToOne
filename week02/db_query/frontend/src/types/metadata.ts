export type TableType = "table" | "view";

export interface ColumnMetadata {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue: string | null;
  position: number;
}

export interface TableMetadata {
  schemaName: string;
  tableName: string;
  tableType: TableType;
  columns: ColumnMetadata[];
}

export interface DatabaseDetail extends DatabaseConnection {
  tables: TableMetadata[];
}
