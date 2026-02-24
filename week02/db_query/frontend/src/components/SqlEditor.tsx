import { Button, Space, Alert } from "antd";
import { PlayCircleOutlined, ClearOutlined, LoadingOutlined } from "@ant-design/icons";
import Editor from "@monaco-editor/react";
import type { Monaco } from "@monaco-editor/react";
import { useEffect, useRef } from "react";

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: () => void;
  loading?: boolean;
  error?: string | null;
}

const motherduckTheme = {
  base: "vs" as const,
  inherit: true,
  rules: [
    { token: "comment", foreground: "9E9B8F", fontStyle: "italic" },
    { token: "keyword", foreground: "1A2B6B", fontStyle: "bold" },
    { token: "keyword.sql", foreground: "1A2B6B", fontStyle: "bold" },
    { token: "string", foreground: "00BFA5" },
    { token: "string.sql", foreground: "00BFA5" },
    { token: "number", foreground: "F4820A" },
    { token: "delimiter", foreground: "5C5A53" },
    { token: "delimiter.parenthesis", foreground: "1A2B6B" },
    { token: "identifier", foreground: "1C1B17" },
    { token: "identifier.quote", foreground: "5C5A53" },
    { token: "operator", foreground: "1A2B6B" },
    { token: "predefined", foreground: "2C3E9A" },
  ],
  colors: {
    "editor.background": "#FFFFFF",
    "editor.foreground": "#1C1B17",
    "editor.lineHighlightBackground": "#FFFBE6",
    "editorLineNumber.foreground": "#9E9B8F",
    "editorLineNumber.activeForeground": "#1A2B6B",
    "editor.selectionBackground": "#FFE234",
    "editor.inactiveSelectionBackground": "#FFFBE6",
    "editorCursor.foreground": "#1A2B6B",
    "editorWhitespace.foreground": "#E5E3DC",
    "editorIndentGuide.background": "#E5E3DC",
    "editorIndentGuide.activeBackground": "#9E9B8F",
  },
};

export function SqlEditor({
  value,
  onChange,
  onExecute,
  loading,
  error,
}: SqlEditorProps) {
  const monacoRef = useRef<Monaco | null>(null);

  const handleEditorChange = (val: string | undefined) => {
    onChange(val || "");
  };

  const handleEditorWillMount = (monaco: Monaco) => {
    monacoRef.current = monaco;
    monaco.editor.defineTheme("motherduck", motherduckTheme);
  };

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme("motherduck");
    }
  }, []);

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[var(--md-blue)] text-lg">SQL Query</h3>
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
            icon={loading ? <LoadingOutlined /> : <PlayCircleOutlined />}
            onClick={onExecute}
            loading={loading}
          >
            Execute
          </Button>
        </Space>
      </div>

      {error && (
        <Alert
          message="Query Error"
          description={error}
          type="error"
          className="mb-4"
          closable
          showIcon
        />
      )}

      <div className="border-2 border-[var(--md-gray-200)] rounded-[var(--radius-lg)] overflow-hidden hover:border-[var(--md-blue)] transition-colors">
        <Editor
          height="200px"
          defaultLanguage="sql"
          value={value}
          onChange={handleEditorChange}
          beforeMount={handleEditorWillMount}
          theme="motherduck"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'DM Mono', monospace",
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: "on",
            tabSize: 2,
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: "all",
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            bracketPairColorization: { enabled: true },
          }}
        />
      </div>
    </div>
  );
}
