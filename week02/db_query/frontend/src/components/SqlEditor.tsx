import { Card, Button, Space, Alert } from "antd";
import { PlayCircleOutlined, ClearOutlined } from "@ant-design/icons";
import Editor from "@monaco-editor/react";

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: () => void;
  loading?: boolean;
  error?: string | null;
}

export function SqlEditor({
  value,
  onChange,
  onExecute,
  loading,
  error,
}: SqlEditorProps) {
  const handleEditorChange = (val: string | undefined) => {
    onChange(val || "");
  };

  return (
    <Card
      title="SQL Query"
      extra={
        <Space>
          <Button
            icon={<ClearOutlined />}
            onClick={() => onChange("")}
            disabled={loading}
          >
            Clear
          </Button>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={onExecute}
            loading={loading}
          >
            Execute
          </Button>
        </Space>
      }
    >
      {error && (
        <Alert
          message="Query Error"
          description={error}
          type="error"
          className="mb-4"
          closable
        />
      )}
      <Editor
        height="200px"
        defaultLanguage="sql"
        value={value}
        onChange={handleEditorChange}
        theme="vs-light"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: "on",
          tabSize: 2,
        }}
      />
    </Card>
  );
}
