import { DeleteOutlined, DatabaseOutlined } from "@ant-design/icons";
import { Button, Card, List, Popconfirm, Space, Tag, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import type { DatabaseConnection } from "@/types/database";

const { Text, Paragraph } = Typography;

interface DatabaseListProps {
  databases: DatabaseConnection[];
  loading?: boolean;
  onDelete: (name: string) => void;
}

export function DatabaseList({ databases, loading, onDelete }: DatabaseListProps) {
  const navigate = useNavigate();

  return (
    <List
      loading={loading}
      dataSource={databases}
      renderItem={(db) => (
        <List.Item>
          <Card
            className="w-full cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/dbs/${db.name}`)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <DatabaseOutlined className="text-lg text-blue-500" />
                  <Text strong className="text-lg">{db.name}</Text>
                </div>
                <Paragraph
                  ellipsis={{ rows: 1 }}
                  className="text-gray-500 mb-2"
                  style={{ marginBottom: 8 }}
                >
                  {db.connectionUrl}
                </Paragraph>
                <Space size="small">
                  <Tag color="blue">{db.tableCount} tables</Tag>
                  <Tag color="green">{db.viewCount} views</Tag>
                </Space>
              </div>
              <Popconfirm
                title="Delete database connection?"
                description="This will remove the connection and cached metadata."
                onConfirm={(e) => {
                  e?.stopPropagation();
                  onDelete(db.name);
                }}
                onCancel={(e) => e?.stopPropagation()}
                okText="Yes, delete"
                cancelText="Cancel"
              >
                <Button
                  danger
                  type="text"
                  icon={<DeleteOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            </div>
          </Card>
        </List.Item>
      )}
    />
  );
}
