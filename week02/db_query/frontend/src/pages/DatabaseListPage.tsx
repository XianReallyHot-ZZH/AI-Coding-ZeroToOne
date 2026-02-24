import { Link } from "react-router-dom";
import { message, Typography, Empty, Spin } from "antd";
import { DatabaseOutlined, DeleteOutlined, TableOutlined, EyeOutlined } from "@ant-design/icons";
import { DatabaseForm } from "@/components/DatabaseForm";
import { useDatabaseList, useDeleteDatabase, useAddDatabase } from "@/services/databaseService";
import type { DatabaseConnectionCreate } from "@/types/database";

const { Text } = Typography;

export function DatabaseListPage() {
  const { data: databases, isLoading, isError, error, refetch } = useDatabaseList();
  const deleteMutation = useDeleteDatabase();
  const addMutation = useAddDatabase();

  const handleAddDatabase = async (data: { name: string; connectionUrl: string }) => {
    const createData: DatabaseConnectionCreate & { name: string } = {
      name: data.name,
      url: data.connectionUrl,
    };
    await addMutation.mutateAsync(createData);
    refetch();
  };

  const handleDeleteDatabase = async (name: string) => {
    try {
      await deleteMutation.mutateAsync(name);
      message.success(`Database "${name}" deleted successfully`);
      refetch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete database";
      message.error(errorMessage);
    }
  };

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="md-card text-center py-16">
          <DatabaseOutlined className="text-6xl text-[var(--md-gray-400)] mb-4" />
          <Text className="text-[var(--md-gray-600)] text-lg block mb-4">
            Failed to load databases
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

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--md-blue-light)] text-sm font-medium text-[var(--md-blue)] mb-4">
          <DatabaseOutlined />
          DATABASE CONNECTIONS
        </div>
        <h1 className="text-4xl font-bold text-[var(--md-blue)] tracking-tight mb-2">
          Your Databases
        </h1>
        <Text className="text-[var(--md-gray-600)] text-lg">
          Connect and manage your PostgreSQL databases
        </Text>
      </div>

      <div className="mb-8">
        <DatabaseForm onSubmit={handleAddDatabase} loading={isLoading} />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <Spin size="large" />
        </div>
      ) : !databases || databases.length === 0 ? (
        <div className="md-card text-center py-16">
          <Empty
            image={<DatabaseOutlined className="text-6xl text-[var(--md-gray-400)]" />}
            description={
              <span className="text-[var(--md-gray-600)]">No databases connected yet</span>
            }
          />
          <Text className="text-sm text-[var(--md-gray-400)] mt-2 block">
            Add your first database connection above to get started
          </Text>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {databases.map((db) => (
            <div key={db.name} className="md-card group relative">
              <Link
                to={`/dbs/${db.name}`}
                className="block"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--md-yellow)] border-2 border-[var(--md-blue)] flex items-center justify-center flex-shrink-0 shadow-[3px_3px_0_0_var(--md-blue)]">
                    <DatabaseOutlined className="text-xl text-[var(--md-blue)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-[var(--md-blue)] tracking-tight mb-1 truncate">
                      {db.name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-[var(--md-gray-600)]">
                      <span className="flex items-center gap-1">
                        <TableOutlined className="text-[var(--md-blue)]" />
                        {db.tableCount || 0} tables
                      </span>
                      <span className="flex items-center gap-1">
                        <EyeOutlined className="text-[var(--md-teal)]" />
                        {db.viewCount || 0} views
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
              
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteDatabase(db.name);
                }}
                disabled={deleteMutation.isPending}
                className="absolute top-4 right-4 p-2 rounded-[var(--radius-md)] text-[var(--md-gray-400)] hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                title="Delete database"
              >
                <DeleteOutlined />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
