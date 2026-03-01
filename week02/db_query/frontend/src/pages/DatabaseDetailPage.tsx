import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { Typography, Spin, Empty, Tree, message } from "antd";
import type { Key } from "react";
import {
  ArrowLeftOutlined,
  DatabaseOutlined,
  TableOutlined,
  EyeOutlined,
  KeyOutlined,
  SearchOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useDatabaseDetail } from "@/services/databaseService";
import type { TableMetadata } from "@/types/metadata";

const { Text } = Typography;

async function refreshMetadata(dbName: string): Promise<void> {
  const response = await fetch(`/api/v1/dbs/${dbName}/refresh`, {
    method: "POST",
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || "Failed to refresh metadata");
  }
}

export function DatabaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableMetadata | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: database, isLoading, isError, error, refetch } = useDatabaseDetail(id!);

  const handleRefresh = async () => {
    if (!id) return;
    setIsRefreshing(true);
    try {
      await refreshMetadata(id);
      message.success("Metadata refreshed successfully");
      refetch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to refresh metadata";
      message.error(errorMessage);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSelectTable = (table: TableMetadata) => {
    setSelectedTable(table);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <Link
          to="/dbs"
          className="inline-flex items-center gap-2 text-[var(--md-gray-600)] hover:text-[var(--md-blue)] mb-4 transition-colors"
        >
          <ArrowLeftOutlined />
          Back to Databases
        </Link>
        <div className="md-card text-center py-16">
          <DatabaseOutlined className="text-6xl text-[var(--md-gray-400)] mb-4" />
          <Text className="text-[var(--md-gray-600)] text-lg block mb-4">
            Failed to load database
          </Text>
          <Text className="text-sm text-red-500 mb-4 block">
            {error?.message || "An unexpected error occurred"}
          </Text>
          <button onClick={() => refetch()} className="md-btn md-btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!database) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="md-card text-center py-16">
          <Empty
            description={<span className="text-[var(--md-gray-600)]">Database not found</span>}
          />
        </div>
      </div>
    );
  }

  const tables = database.tables || [];

  // Generate unique key for table selection comparison
  const getTableKey = (table: TableMetadata) => `${table.schemaName}.${table.tableName}`;

  // Check if a table is currently selected
  const isSelectedTable = (table: TableMetadata) =>
    selectedTable ? getTableKey(selectedTable) === getTableKey(table) : false;

  const treeData = tables.map((table) => ({
    key: getTableKey(table),
    title: (
      <div
        className={`flex items-center gap-3 py-1.5 px-2 rounded-[var(--radius-sm)] cursor-pointer transition-colors ${
          isSelectedTable(table) ? "bg-[var(--md-yellow-pale)]" : "hover:bg-[var(--md-gray-100)]"
        }`}
        onClick={() => handleSelectTable(table)}
      >
        {table.tableType === "table" ? (
          <TableOutlined className="text-[var(--md-blue)]" />
        ) : (
          <EyeOutlined className="text-[var(--md-teal)]" />
        )}
        <Text className="flex-1 font-medium">{table.tableName}</Text>
        <span className={`md-tag ${table.tableType === "table" ? "md-tag-blue" : "md-tag-teal"}`}>
          {table.tableType}
        </span>
      </div>
    ),
    children: table.columns.map((col) => ({
      key: `${table.schemaName}.${table.tableName}.${col.columnName}.${col.position}`,
      title: (
        <div className="flex items-center gap-3 py-1 px-2">
          <Text className="text-sm font-medium">{col.columnName}</Text>
          <Text type="secondary" className="text-xs mono">
            {col.dataType}
          </Text>
          {col.isPrimaryKey && (
            <span className="md-tag md-tag-orange">
              <KeyOutlined className="text-xs" /> PK
            </span>
          )}
          {!col.isNullable && (
            <span className="text-xs text-[var(--md-gray-400)]">NOT NULL</span>
          )}
        </div>
      ),
      isLeaf: true,
    })),
  }));

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8">
        <Link
          to="/dbs"
          className="inline-flex items-center gap-2 text-[var(--md-gray-600)] hover:text-[var(--md-blue)] mb-4 transition-colors"
        >
          <ArrowLeftOutlined />
          Back to Databases
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[var(--radius-xl)] bg-[var(--md-yellow)] border-2 border-[var(--md-blue)] flex items-center justify-center shadow-[4px_4px_0_0_var(--md-blue)]">
              <DatabaseOutlined className="text-3xl text-[var(--md-blue)]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[var(--md-blue)] tracking-tight mb-1">
                {database.name}
              </h1>
              <div className="flex items-center gap-4 text-sm text-[var(--md-gray-600)]">
                <span className="flex items-center gap-1">
                  <TableOutlined className="text-[var(--md-blue)]" />
                  {database.tableCount || 0} tables
                </span>
                <span className="flex items-center gap-1">
                  <EyeOutlined className="text-[var(--md-teal)]" />
                  {database.viewCount || 0} views
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="md-btn md-btn-ghost"
            >
              <ReloadOutlined spin={isRefreshing} />
              Refresh
            </button>
            <Link to={`/dbs/${id}/query`} className="md-btn md-btn-primary">
              <SearchOutlined />
              Query Database
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="md-card h-fit">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[var(--md-blue)] text-lg">Tables & Views</h3>
              <span className="text-sm text-[var(--md-gray-400)]">{tables.length} items</span>
            </div>
            
            {tables.length === 0 ? (
              <div className="text-center py-8">
                <TableOutlined className="text-4xl text-[var(--md-gray-400)] mb-2" />
                <Text className="text-[var(--md-gray-600)]">No tables found</Text>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-auto">
                <Tree
                  treeData={treeData}
                  expandedKeys={expandedKeys}
                  onExpand={(keys) => setExpandedKeys(keys)}
                  showLine={{ showLeafIcon: false }}
                  blockNode
                />
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedTable ? (
            <div className="md-card">
              <div className="flex items-center gap-3 mb-6">
                {selectedTable.tableType === "table" ? (
                  <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--md-blue-light)] flex items-center justify-center">
                    <TableOutlined className="text-[var(--md-blue)]" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[rgba(0,191,165,0.1)] flex items-center justify-center">
                    <EyeOutlined className="text-[var(--md-teal)]" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-[var(--md-blue)] text-lg">
                    {selectedTable.tableName}
                  </h3>
                  <Text className="text-sm text-[var(--md-gray-600)]">
                    {selectedTable.schemaName}.{selectedTable.tableName}
                  </Text>
                </div>
                <span className={`ml-auto md-tag ${selectedTable.tableType === "table" ? "md-tag-blue" : "md-tag-teal"}`}>
                  {selectedTable.tableType}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-[var(--md-blue)]">
                      <th className="text-left py-3 px-4 font-semibold text-[var(--md-blue)] bg-[var(--md-blue-light)]">Column</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--md-blue)] bg-[var(--md-blue-light)]">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--md-blue)] bg-[var(--md-blue-light)]">Constraints</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTable.columns.map((col, idx) => (
                      <tr
                        key={`${col.columnName}-${col.position}`}
                        className={`border-b border-[var(--md-gray-200)] hover:bg-[var(--md-yellow-pale)] transition-colors ${
                          idx % 2 === 0 ? "bg-white" : "bg-[var(--md-gray-100)]"
                        }`}
                      >
                        <td className="py-3 px-4">
                          <Text className="font-medium">{col.columnName}</Text>
                        </td>
                        <td className="py-3 px-4">
                          <Text className="mono text-sm text-[var(--md-gray-600)]">{col.dataType}</Text>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            {col.isPrimaryKey && (
                              <span className="md-tag md-tag-orange">
                                <KeyOutlined className="text-xs" /> PK
                              </span>
                            )}
                            {!col.isNullable && (
                              <span className="text-xs text-[var(--md-gray-500)]">NOT NULL</span>
                            )}
                            {col.defaultValue && (
                              <span className="text-xs text-[var(--md-gray-400)] mono">
                                DEFAULT {col.defaultValue}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="md-card text-center py-16">
              <TableOutlined className="text-6xl text-[var(--md-gray-400)] mb-4" />
              <Text className="text-[var(--md-gray-600)] text-lg block mb-2">
                Select a table to view details
              </Text>
              <Text className="text-sm text-[var(--md-gray-400)]">
                Click on any table from the sidebar to see its columns
              </Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
