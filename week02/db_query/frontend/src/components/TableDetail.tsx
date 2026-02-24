import { Card, Table, Tag, Typography, Empty } from "antd";
import type { ColumnMetadata, TableMetadata } from "@/types/metadata";

const { Title, Text } = Typography;

interface TableDetailProps {
  table: TableMetadata | null;
  loading?: boolean;
}

export function TableDetail({ table, loading }: TableDetailProps) {
  if (!table) {
    return (
      <Card className="h-full">
        <Empty description="Select a table to view details" />
      </Card>
    );
  }

  const columns = [
    {
      title: "#",
      dataIndex: "position",
      key: "position",
      width: 50,
    },
    {
      title: "Column Name",
      dataIndex: "columnName",
      key: "columnName",
      render: (name: string, record: ColumnMetadata) => (
        <div className="flex items-center gap-2">
          <Text strong>{name}</Text>
          {record.isPrimaryKey && (
            <Tag color="gold" className="text-xs">PK</Tag>
          )}
        </div>
      ),
    },
    {
      title: "Type",
      dataIndex: "dataType",
      key: "dataType",
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: "Nullable",
      dataIndex: "isNullable",
      key: "isNullable",
      width: 80,
      render: (nullable: boolean) => (
        <Tag color={nullable ? "default" : "red"}>
          {nullable ? "YES" : "NO"}
        </Tag>
      ),
    },
    {
      title: "Default",
      dataIndex: "defaultValue",
      key: "defaultValue",
      render: (value: string | null) =>
        value ? <Text code>{value}</Text> : <Text type="secondary">-</Text>,
    },
  ];

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Title level={5} className="m-0">
            {table.schemaName}.{table.tableName}
          </Title>
          <Tag color={table.tableType === "table" ? "blue" : "green"}>
            {table.tableType.toUpperCase()}
          </Tag>
        </div>
      }
      loading={loading}
    >
      <Table
        dataSource={table.columns}
        columns={columns}
        rowKey="columnName"
        pagination={false}
        size="small"
        bordered
      />
    </Card>
  );
}
