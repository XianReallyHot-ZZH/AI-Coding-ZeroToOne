import { useState } from "react";
import { Form, Input, Button, Typography, message, Tag } from "antd";
import { DatabaseOutlined, PlusOutlined, LoadingOutlined } from "@ant-design/icons";

const { Text } = Typography;

// Database type detection
type DatabaseType = 'postgresql' | 'mysql' | 'sqlite' | 'unknown';

function detectDatabaseType(url: string): DatabaseType {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.startsWith('mysql://') || lowerUrl.startsWith('mysql+pymysql://')) {
    return 'mysql';
  }
  if (lowerUrl.startsWith('postgresql://') || lowerUrl.startsWith('postgres://')) {
    return 'postgresql';
  }
  if (lowerUrl.startsWith('sqlite://')) {
    return 'sqlite';
  }
  return 'unknown';
}

function getDatabaseTypeLabel(type: DatabaseType): string {
  const labels: Record<DatabaseType, string> = {
    postgresql: 'PostgreSQL',
    mysql: 'MySQL',
    sqlite: 'SQLite',
    unknown: 'Unknown',
  };
  return labels[type];
}

function getDatabaseTypeColor(type: DatabaseType): string {
  const colors: Record<DatabaseType, string> = {
    postgresql: '#336791',
    mysql: '#4479A1',
    sqlite: '#003B57',
    unknown: '#666666',
  };
  return colors[type];
}

interface DatabaseFormProps {
  onSubmit: (data: { name: string; connectionUrl: string }) => Promise<void>;
  loading?: boolean;
}

export function DatabaseForm({ onSubmit, loading }: DatabaseFormProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [connectionUrl, setConnectionUrl] = useState("");
  const detectedType = detectDatabaseType(connectionUrl);

  const handleSubmit = async (values: { name: string; connectionUrl: string }) => {
    setSubmitting(true);
    try {
      await onSubmit(values);
      form.resetFields();
      setConnectionUrl("");
      message.success("Database connection added successfully!");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add database connection";
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const validateConnectionUrl = (_: unknown, value: string) => {
    if (!value) {
      return Promise.reject("Please enter a connection URL");
    }
    const type = detectDatabaseType(value);
    if (type === 'unknown') {
      return Promise.reject("Must be a valid PostgreSQL, MySQL, or SQLite URL");
    }
    return Promise.resolve();
  };

  return (
    <div className="md-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--md-yellow)] border-2 border-[var(--md-blue)] flex items-center justify-center shadow-[2px_2px_0_0_var(--md-blue)]">
          <PlusOutlined className="text-[var(--md-blue)]" />
        </div>
        <div>
          <h3 className="font-bold text-[var(--md-blue)] text-lg">Add Database Connection</h3>
          <Text className="text-sm text-[var(--md-gray-600)]">Connect to a PostgreSQL, MySQL, or SQLite database</Text>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name="name"
            label={<span className="font-medium text-[var(--md-gray-600)]">Connection Name</span>}
            rules={[{ required: true, message: "Please enter a name" }]}
          >
            <Input
              placeholder="my-database"
              prefix={<DatabaseOutlined className="text-[var(--md-gray-400)]" />}
              disabled={submitting || loading}
            />
          </Form.Item>

          <Form.Item
            name="connectionUrl"
            label={
              <div className="flex items-center gap-2">
                <span className="font-medium text-[var(--md-gray-600)]">Connection URL</span>
                {detectedType !== 'unknown' && (
                  <Tag
                    color={getDatabaseTypeColor(detectedType)}
                    style={{ marginLeft: 8 }}
                  >
                    {getDatabaseTypeLabel(detectedType)}
                  </Tag>
                )}
              </div>
            }
            rules={[
              { required: true, message: "Please enter a connection URL" },
              { validator: validateConnectionUrl },
            ]}
          >
            <Input.Password
              placeholder="postgresql://user:pass@host:5432/db or mysql://user:pass@host:3306/db"
              visibilityToggle={{ visible: false }}
              disabled={submitting || loading}
              onChange={(e) => setConnectionUrl(e.target.value)}
            />
          </Form.Item>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <Text type="secondary" className="text-xs block mb-2">
            <strong>Supported databases:</strong>
          </Text>
          <div className="flex gap-2 mb-2">
            <Tag color="#336791">PostgreSQL</Tag>
            <Tag color="#4479A1">MySQL</Tag>
            <Tag color="#003B57">SQLite</Tag>
          </div>
          <Text type="secondary" className="text-xs block">
            <strong>Example URLs:</strong>
          </Text>
          <div className="mt-1 space-y-1 text-xs font-mono text-gray-500">
            <div>postgresql://postgres:password@localhost:5432/mydb</div>
            <div>mysql://root:password@localhost:3306/mydb</div>
            <div>mysql://root@localhost/mydb <span className="text-gray-400">(no password)</span></div>
            <div>sqlite:///path/to/database.db</div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting || loading}
            icon={submitting || loading ? <LoadingOutlined /> : <PlusOutlined />}
          >
            Add Connection
          </Button>
        </div>
      </Form>
    </div>
  );
}
