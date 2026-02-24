import { Table, Typography } from "antd";
import { TableOutlined, LoadingOutlined } from "@ant-design/icons";
import type { QueryResult } from "@/types/query";

const { Text } = Typography;

interface QueryResultComponentProps {
  result: QueryResult | null;
  loading?: boolean;
}

export function QueryResultComponent({ result, loading }: QueryResultComponentProps) {
  if (loading) {
    return (
      <div className="md-card text-center py-16">
        <LoadingOutlined className="text-4xl text-[var(--md-blue)] mb-4" />
        <Text className="text-[var(--md-gray-600)]">Executing query...</Text>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="md-card text-center py-16">
        <TableOutlined className="text-5xl text-[var(--md-gray-400)] mb-4" />
        <Text className="text-[var(--md-gray-600)] text-lg block mb-2">
          No results yet
        </Text>
        <Text className="text-sm text-[var(--md-gray-400)]">
          Execute a query to see results here
        </Text>
      </div>
    );
  }

  const columns = result.columns.map((col) => ({
    title: (
      <span className="font-semibold">
        {col.name}
        <span className="font-normal text-[var(--md-gray-400)] ml-2 text-xs mono">
          {col.type}
        </span>
      </span>
    ),
    dataIndex: col.name,
    key: col.name,
    ellipsis: true,
    render: (value: unknown) => {
      if (value === null) {
        return <span className="text-[var(--md-gray-400)] italic">NULL</span>;
      }
      if (typeof value === "boolean") {
        return (
          <span className={`md-tag ${value ? "md-tag-teal" : "md-tag-orange"}`}>
            {value.toString()}
          </span>
        );
      }
      if (typeof value === "number") {
        return <span className="mono">{value}</span>;
      }
      return String(value);
    },
  }));

  return (
    <div className="md-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--md-teal)] bg-opacity-10 flex items-center justify-center">
            <TableOutlined className="text-[var(--md-teal)]" />
          </div>
          <div>
            <h3 className="font-bold text-[var(--md-blue)] text-lg">Query Results</h3>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-[var(--md-gray-600)]">
                {result.rowCount} row{result.rowCount !== 1 ? "s" : ""}
              </span>
              {result.truncated && (
                <span className="md-tag md-tag-orange">Truncated</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table
          columns={columns}
          dataSource={result.rows.map((row, index) => ({ ...row, _key: index }))}
          rowKey="_key"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `${total} rows`,
          }}
          size="small"
          scroll={{ x: "max-content" }}
        />
      </div>
    </div>
  );
}
