import { useNavigate } from "react-router-dom";
import { message, Typography } from "antd";
import { DatabaseList } from "@/components/DatabaseList";
import { DatabaseForm } from "@/components/DatabaseForm";
import { useDatabaseList, useDeleteDatabase, useAddDatabase } from "@/services/databaseService";
import type { DatabaseConnectionCreate } from "@/types/database";

const { Title } = Typography;

export function DatabaseListPage() {
  const navigate = useNavigate();
  const { data: databases, isLoading, refetch } = useDatabaseList();
  const deleteMutation = useDeleteDatabase();
  const addMutation = useAddDatabase();

  const handleAddDatabase = async (data: DatabaseConnectionCreate & { name: string }) => {
    await addMutation.mutateAsync(data);
    refetch();
  };

  const handleDeleteDatabase = async (name: string) => {
    try {
      await deleteMutation.mutateAsync(name);
      message.success(`Database "${name}" deleted`);
      refetch();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete database";
      message.error(errorMessage);
    }
  };

  return (
    <div className="p-6">
      <Title level={3} className="mb-6">Database Connections</Title>
      
      <DatabaseForm onSubmit={handleAddDatabase} loading={isLoading} />
      
      <DatabaseList
        databases={databases || []}
        loading={isLoading}
        onDelete={handleDeleteDatabase}
      />
    </div>
  );
}
