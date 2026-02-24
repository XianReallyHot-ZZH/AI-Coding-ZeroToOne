import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { Typography, Spin, message, Tabs } from "antd";
import {
  ArrowLeftOutlined,
  DatabaseOutlined,
  CodeOutlined,
  MessageOutlined,
  TableOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { SqlEditor } from "@/components/SqlEditor";
import { QueryResultComponent } from "@/components/QueryResult";
import { NlQueryInput } from "@/components/NlQueryInput";
import { useExecuteQuery, useGenerateSql } from "@/services/queryService";
import { useDatabaseDetail } from "@/services/databaseService";
import type { QueryResult } from "@/types/query";

const { Text } = Typography;

export function QueryPage() {
  const { id } = useParams<{ id: string }>();
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
      <div className="max-w-7xl mx-auto p-8">
        <div className="md-card text-center py-16">
          <DatabaseOutlined className="text-6xl text-[var(--md-gray-400)] mb-4" />
          <Text className="text-[var(--md-gray-600)] text-lg">Database not found</Text>
        </div>
      </div>
    );
  }

  const tabItems = [
    {
      key: "manual",
      label: (
        <span className="flex items-center gap-2">
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
        <span className="flex items-center gap-2">
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
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8">
        <Link
          to={`/dbs/${id}`}
          className="inline-flex items-center gap-2 text-[var(--md-gray-600)] hover:text-[var(--md-blue)] mb-4 transition-colors"
        >
          <ArrowLeftOutlined />
          Back to Database
        </Link>

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-[var(--radius-xl)] bg-[var(--md-yellow)] border-2 border-[var(--md-blue)] flex items-center justify-center shadow-[4px_4px_0_0_var(--md-blue)]">
            <DatabaseOutlined className="text-2xl text-[var(--md-blue)]" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--md-blue-light)] text-xs font-medium text-[var(--md-blue)] mb-1">
              <CodeOutlined />
              SQL QUERY
            </div>
            <h1 className="text-2xl font-bold text-[var(--md-blue)] tracking-tight">
              Query: {database.name}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-4 text-sm text-[var(--md-gray-600)]">
            <span className="flex items-center gap-1">
              <TableOutlined className="text-[var(--md-blue)]" />
              {database.tableCount || 0} tables
            </span>
            <span className="flex items-center gap-1">
              <EyeOutlined className="text-[var(--md-teal)]" />
              {database.viewCount || 0} views
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="md-card p-0 overflow-hidden">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            className="[&_.ant-tabs-nav]:px-6 [&_.ant-tabs-nav]:pt-4 [&_.ant-tabs-nav]:mb-0 [&_.ant-tabs-content]:px-6 [&_.ant-tabs-content]:pb-6"
          />
        </div>

        <QueryResultComponent result={result} loading={executeMutation.isPending} />
      </div>
    </div>
  );
}
