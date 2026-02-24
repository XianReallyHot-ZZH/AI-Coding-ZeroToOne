import { Card, Table, Alert, Empty, Tag, Typography, Space } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import type { QueryResult } from "@/types/query";

const { Text } = Typography;

interface QueryResultProps {
  result: QueryResult | null;
  loading?: boolean;
}

export function QueryResultComponent({ result, loading }: QueryResultProps) {
  if (!result) {
    return (
      <Card title="Results">
        <Empty description="Execute a query to see results" />
      </Card>
    );
  }

  const columns = result.columns.map((col) => ({
    title: (
      <div className="flex flex-col">
        <Text strong>{col.name}</Text>
        <Text type="secondary" className="text-xs">
          {col.type}
        </Text>
      </div>
    ),
    dataIndex: col.name,
    key: col.name,
    ellipsis: true,
    render: (value: unknown) => {
      if (value === null) {
        return <Text type="secondary">NULL</Text>;
      }
      if (typeof value === "boolean") {
        return <Tag color={value ? "green" : "red"}>{String(value)}</Tag>;
      }
      if (typeof value === "number") {
        return <Text code>{String(value)}</Text>;
      }
      return String(value);
    },
  }));

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <span>Results</span>
          <Space>
            <Text type="secondary">{result.rowCount} rows</Text>
            {result.truncated && (
              <Tag icon={<WarningOutlined />} color="warning">
                Truncated (max 1000 rows)
              </Tag>
            )}
          </Space>
        </div>
      }
      loading={loading}
    >
      {result.truncated && (
        <Alert
          message="Results truncated"
          description="Only the first 1000 rows are displayed. Add a LIMIT clause to your query for more specific results."
          type="warning"
          className="mb-4"
          showIcon
        />
      )}
      <Table
        dataSource={result.rows}
        columns={columns}
        rowKey={(_, index) => `row-${index}`}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `${total} rows`,
        }}
        scroll={{ x: "max-content" }}
        size="small"
        bordered
      />
    </Card>
  );
}
