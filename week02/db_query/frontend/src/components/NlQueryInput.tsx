import { useState } from "react";
import { Input, Button, Space, Alert, Typography, Card } from "antd";
import { SendOutlined, LoadingOutlined } from "@ant-design/icons";

const { TextArea } = Input;
const { Text } = Typography;

interface NlQueryInputProps {
  onGenerate: (question: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  generatedSql?: string;
  explanation?: string;
}

export function NlQueryInput({
  onGenerate,
  loading,
  error,
  generatedSql,
  explanation,
}: NlQueryInputProps) {
  const [question, setQuestion] = useState("");

  const handleGenerate = async () => {
    if (question.trim()) {
      await onGenerate(question.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleGenerate();
    }
  };

  return (
    <Card title="Natural Language Query" className="mb-4">
      <Space.Compact style={{ width: "100%" }} className="mb-2">
        <TextArea
          placeholder="Describe what you want to query in natural language (e.g., '查询所有活跃用户的邮箱')"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          autoSize={{ minRows: 2, maxRows: 4 }}
          disabled={loading}
        />
      </Space.Compact>
      <div className="flex justify-between items-center">
        <Text type="secondary" className="text-xs">
          Press Ctrl+Enter to generate
        </Text>
        <Button
          type="primary"
          icon={loading ? <LoadingOutlined /> : <SendOutlined />}
          onClick={handleGenerate}
          loading={loading}
          disabled={!question.trim()}
        >
          Generate SQL
        </Button>
      </div>

      {error && (
        <Alert
          message="Generation Error"
          description={error}
          type="error"
          className="mt-4"
          closable
        />
      )}

      {generatedSql && !error && (
        <div className="mt-4">
          <Text strong>Generated SQL:</Text>
          <pre className="bg-gray-50 p-3 rounded mt-2 text-sm overflow-x-auto">
            {generatedSql}
          </pre>
          {explanation && (
            <div className="mt-2">
              <Text type="secondary">Explanation: {explanation}</Text>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
