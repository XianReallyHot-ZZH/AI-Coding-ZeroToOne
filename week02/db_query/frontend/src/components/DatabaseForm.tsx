import { useState } from "react";
import { Form, Input, Button, Typography, message } from "antd";
import { DatabaseOutlined, PlusOutlined, LoadingOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface DatabaseFormProps {
  onSubmit: (data: { name: string; connectionUrl: string }) => Promise<void>;
  loading?: boolean;
}

export function DatabaseForm({ onSubmit, loading }: DatabaseFormProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: { name: string; connectionUrl: string }) => {
    setSubmitting(true);
    try {
      await onSubmit(values);
      form.resetFields();
      message.success("Database connection added successfully!");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add database connection";
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="md-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--md-yellow)] border-2 border-[var(--md-blue)] flex items-center justify-center shadow-[2px_2px_0_0_var(--md-blue)]">
          <PlusOutlined className="text-[var(--md-blue)]" />
        </div>
        <div>
          <h3 className="font-bold text-[var(--md-blue)] text-lg">Add Database Connection</h3>
          <Text className="text-sm text-[var(--md-gray-600)]">Connect to a PostgreSQL database</Text>
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
            label={<span className="font-medium text-[var(--md-gray-600)]">Connection URL</span>}
            rules={[
              { required: true, message: "Please enter a connection URL" },
              {
                pattern: /^postgresql:\/\//,
                message: "Must be a valid PostgreSQL URL",
              },
            ]}
          >
            <Input.Password
              placeholder="postgresql://user:pass@host:5432/db"
              visibilityToggle={{ visible: false }}
              disabled={submitting || loading}
            />
          </Form.Item>
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
