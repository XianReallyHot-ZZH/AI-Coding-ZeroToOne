import { useState } from "react";
import { Input, Button, Alert, Typography, message } from "antd";
import { SendOutlined, LoadingOutlined, CopyOutlined, CheckOutlined } from "@ant-design/icons";

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
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (question.trim()) {
      await onGenerate(question.trim());
    }
  };

  const handleCopy = () => {
    if (generatedSql) {
      navigator.clipboard.writeText(generatedSql);
      setCopied(true);
      message.success("SQL copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[var(--md-blue)] text-lg">Natural Language Query</h3>
        <span className="text-sm text-[var(--md-gray-400)]">
          Powered by Deepseek
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--md-gray-600)] mb-2">
            Describe what you want to query
          </label>
          <TextArea
            placeholder="e.g., 查询所有活跃用户的邮箱和注册时间"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            autoSize={{ minRows: 2, maxRows: 4 }}
            disabled={loading}
            className="text-base"
          />
        </div>

        <div className="flex items-center justify-between">
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
            closable
            showIcon
          />
        )}

        {generatedSql && !error && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <Text strong className="text-[var(--md-blue)]">
                Generated SQL:
              </Text>
              <Button
                type="text"
                size="small"
                icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                onClick={handleCopy}
                className={copied ? "text-[var(--md-teal)]" : ""}
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <div className="bg-[var(--md-blue)] rounded-[var(--radius-lg)] p-4 overflow-x-auto">
              <pre className="mono text-sm text-[var(--md-yellow)] whitespace-pre-wrap">
                {generatedSql}
              </pre>
            </div>
            {explanation && (
              <div className="mt-3 p-3 bg-[var(--md-blue-light)] rounded-[var(--radius-md)]">
                <Text type="secondary" className="text-sm">
                  <strong>Explanation:</strong> {explanation}
                </Text>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
