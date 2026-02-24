import { TableOutlined, EyeOutlined } from "@ant-design/icons";
import { Card, Tree, Tag, Badge, Typography } from "antd";
import { useState } from "react";
import type { Key } from "react";
import type { TableMetadata } from "@/types/metadata";

const { Text } = Typography;

interface MetadataBrowserProps {
  tables: TableMetadata[];
  onSelectTable: (table: TableMetadata) => void;
  selectedTable?: TableMetadata | null;
  loading?: boolean;
}

export function MetadataBrowser({
  tables,
  onSelectTable,
  selectedTable,
  loading,
}: MetadataBrowserProps) {
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);

  const treeData = tables.map((table) => ({
    key: `${table.schemaName}.${table.tableName}`,
    title: (
      <div
        className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer ${
          selectedTable?.tableName === table.tableName ? "bg-blue-50" : ""
        }`}
        onClick={() => onSelectTable(table)}
      >
        {table.tableType === "table" ? (
          <TableOutlined className="text-blue-500" />
        ) : (
          <EyeOutlined className="text-green-500" />
        )}
        <Text className="flex-1">{table.tableName}</Text>
        <Tag color={table.tableType === "table" ? "blue" : "green"} className="text-xs">
          {table.tableType}
        </Tag>
      </div>
    ),
    children: table.columns.map((col) => ({
      key: `${table.schemaName}.${table.tableName}.${col.columnName}`,
      title: (
        <div className="flex items-center gap-2 py-0.5">
          <Text className="text-sm">{col.columnName}</Text>
          <Text type="secondary" className="text-xs">
            {col.dataType}
          </Text>
          {col.isPrimaryKey && (
            <Badge count="PK" className="text-xs" style={{ backgroundColor: "#faad14" }} />
          )}
          {!col.isNullable && (
            <Badge count="NN" className="text-xs" style={{ backgroundColor: "#ff4d4f" }} />
          )}
        </div>
      ),
      isLeaf: true,
    })),
  }));

  const autoExpandKeys = tables
    .filter((t) => t.tableName === selectedTable?.tableName)
    .map((t) => `${t.schemaName}.${t.tableName}`);

  return (
    <Card
      title="Tables & Views"
      loading={loading}
      className="h-full overflow-auto"
      styles={{ body: { maxHeight: "calc(100vh - 300px)", overflow: "auto" } }}
    >
      {tables.length === 0 ? (
        <Text type="secondary">No tables found</Text>
      ) : (
        <Tree
          treeData={treeData}
          expandedKeys={[...expandedKeys, ...autoExpandKeys]}
          onExpand={(keys) => setExpandedKeys(keys)}
          showLine
          blockNode
        />
      )}
    </Card>
  );
}
