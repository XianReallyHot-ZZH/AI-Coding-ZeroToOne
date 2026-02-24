import { DatabaseOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, message, Space, Typography } from "antd";
import { useState } from "react";
import type { DatabaseConnectionCreate } from "@/types/database";

const { Title, Text } = Typography;

interface DatabaseFormProps {
  onSubmit: (data: DatabaseConnectionCreate & { name: string }) => Promise<void>;
  loading?: boolean;
}

export function DatabaseForm({ onSubmit, loading }: DatabaseFormProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: DatabaseConnectionCreate & { name: string }) => {
    setSubmitting(true);
    try {
      await onSubmit(values);
      form.resetFields();
      message.success("Database connection added successfully!");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add database";
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mb-6">
      <Title level={5} className="mb-4">
        <DatabaseOutlined className="mr-2" />
        Add Database Connection
      </Title>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={loading || submitting}
      >
        <Form.Item
          name="name"
          label="Connection Name"
          rules={[
            { required: true, message: "Please enter a connection name" },
            {
              pattern: /^[a-z0-9_-]+$/,
              message: "Only lowercase letters, numbers, underscore, and hyphen allowed",
            },
          ]}
        >
          <Input placeholder="my-postgres" />
        </Form.Item>

        <Form.Item
          name="url"
          label="Connection URL"
          rules={[
            { required: true, message: "Please enter a connection URL" },
          ]}
          extra={
            <Text type="secondary" className="text-xs">
              Example: postgresql://user:password@host:port/database
            </Text>
          }
        >
          <Input.Password
            placeholder="postgresql://postgres:postgres@localhost:5432/mydb"
          />
        </Form.Item>

        <Form.Item className="mb-0">
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Connect
            </Button>
            <Button onClick={() => form.resetFields()}>Clear</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
