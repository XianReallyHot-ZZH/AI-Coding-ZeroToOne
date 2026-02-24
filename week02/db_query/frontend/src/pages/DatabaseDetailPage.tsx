import { useParams, useNavigate } from "react-router-dom";
import { Button, Card, Col, Row, Space, Spin, Tag, Typography, message } from "antd";
import { ArrowLeftOutlined, ReloadOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { useState } from "react";
import { MetadataBrowser } from "@/components/MetadataBrowser";
import { TableDetail } from "@/components/TableDetail";
import { useDatabaseDetail, useRefreshDatabase } from "@/services/databaseService";
import type { TableMetadata } from "@/types/metadata";

const { Title, Text } = Typography;

export function DatabaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedTable, setSelectedTable] = useState<TableMetadata | null>(null);

  const { data: database, isLoading, refetch } = useDatabaseDetail(id!);
  const refreshMutation = useRefreshDatabase();

  const handleRefresh = async () => {
    if (!id) return;
    try {
      await refreshMutation.mutateAsync(id);
      message.success("Metadata refreshed successfully");
      refetch();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to refresh";
      message.error(errorMessage);
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

  if (!database) {
    return (
      <div className="p-6">
        <Text type="secondary">Database not found</Text>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/dbs")}>
            Back
          </Button>
        </Space>
      </div>

      <Card className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <Title level={3} className="mb-2">
              {database.name}
            </Title>
            <Text type="secondary" className="block mb-3">
              {database.connectionUrl}
            </Text>
            <Space>
              <Tag color="blue">{database.tableCount} tables</Tag>
              <Tag color="green">{database.viewCount} views</Tag>
              <Text type="secondary" className="text-sm">
                Last updated: {new Date(database.updatedAt).toLocaleString()}
              </Text>
            </Space>
          </div>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={refreshMutation.isPending}
            >
              Refresh Metadata
            </Button>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => navigate(`/dbs/${id}/query`)}
            >
              Run Query
            </Button>
          </Space>
        </div>
      </Card>

      <Row gutter={16}>
        <Col span={8}>
          <MetadataBrowser
            tables={database.tables}
            onSelectTable={handleSelectTable}
            selectedTable={selectedTable}
          />
        </Col>
        <Col span={16}>
          <TableDetail table={selectedTable} />
        </Col>
      </Row>
    </div>
  );
}
