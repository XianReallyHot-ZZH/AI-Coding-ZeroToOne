import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button, Card, Space, Spin, Typography, message, Tabs } from "antd";
import { ArrowLeftOutlined, DatabaseOutlined, CodeOutlined, MessageOutlined } from "@ant-design/icons";
import { SqlEditor } from "@/components/SqlEditor";
import { QueryResultComponent } from "@/components/QueryResult";
import { NlQueryInput } from "@/components/NlQueryInput";
import { useExecuteQuery, useGenerateSql } from "@/services/queryService";
import { useDatabaseDetail } from "@/services/databaseService";
import type { QueryResult } from "@/types/query";

const { Title, Text } = Typography;

export function QueryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sql, setSql] = useState("SELECT * FROM ");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nlError, setNlError] = useState<string | null>(null);
  const [generatedSql, setGeneratedSql] = useState<string>("");
  const [explanation, setExplanation] = useState<string>("");
  const [activeTab, setActiveTab] = useState("manual");

  const { data: database, isLoading: isLoadingDb } = useDatabaseDetail(id!);
  const executeMutation = useExecuteQuery(id!);
  const generateMutation = useGenerateSql(id!);

  const handleExecute = async () => {
    if (!sql.trim()) {
      message.warning("Please enter a SQL query");
      return;
    }

    setError(null);
    setResult(null);

    try {
      const res = await executeMutation.mutateAsync(sql);
      setResult(res);
      message.success(`Query executed successfully. ${res.rowCount} rows returned.`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to execute query";
      setError(errorMessage);
      message.error(errorMessage);
    }
  };

  const handleGenerateSql = async (question: string) => {
    setNlError(null);
    setGeneratedSql("");
    setExplanation("");

    try {
      const res = await generateMutation.mutateAsync(question);
      setGeneratedSql(res.sql);
      setExplanation(res.explanation);
      setSql(res.sql);
      setActiveTab("manual");
      message.success("SQL generated successfully. Review and execute.");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate SQL";
      setNlError(errorMessage);
      message.error(errorMessage);
    }
  };

  if (isLoadingDb) {
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

  const tabItems = [
    {
      key: "manual",
      label: (
        <span>
          <CodeOutlined />
          Manual SQL
        </span>
      ),
      children: (
        <SqlEditor
          value={sql}
          onChange={setSql}
          onExecute={handleExecute}
          loading={executeMutation.isPending}
          error={error}
        />
      ),
    },
    {
      key: "natural",
      label: (
        <span>
          <MessageOutlined />
          Natural Language
        </span>
      ),
      children: (
        <NlQueryInput
          onGenerate={handleGenerateSql}
          loading={generateMutation.isPending}
          error={nlError}
          generatedSql={generatedSql}
          explanation={explanation}
        />
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/dbs/${id}`)}>
            Back to Database
          </Button>
        </Space>
      </div>

      <Card className="mb-6">
        <div className="flex items-center gap-3">
          <DatabaseOutlined className="text-2xl text-blue-500" />
          <div>
            <Title level={4} className="mb-0">
              Query: {database.name}
            </Title>
            <Text type="secondary">
              {database.tableCount} tables, {database.viewCount} views
            </Text>
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />

        <QueryResultComponent result={result} loading={executeMutation.isPending} />
      </div>
    </div>
  );
}
