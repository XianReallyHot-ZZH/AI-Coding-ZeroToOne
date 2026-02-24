import { Refine } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { ThemedLayout, useNotificationProvider } from "@refinedev/antd";
import routerProvider from "@refinedev/react-router";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ConfigProvider, App as AntdApp } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { dataProvider } from "./services/api";
import { DatabaseListPage } from "./pages/DatabaseListPage";
import { DatabaseDetailPage } from "./pages/DatabaseDetailPage";
import { QueryPage } from "./pages/QueryPage";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RefineKbarProvider>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: "#1890ff",
              },
            }}
          >
            <AntdApp>
              <Refine
                dataProvider={dataProvider}
                routerProvider={routerProvider}
                notificationProvider={useNotificationProvider}
                resources={[
                  {
                    name: "dbs",
                    list: "/dbs",
                    show: "/dbs/:id",
                    meta: {
                      label: "Databases",
                    },
                  },
                ]}
              >
                <ThemedLayout>
                  <Routes>
                    <Route
                      path="/"
                      element={
                        <div className="p-6">
                          <h1 className="text-2xl font-bold">Database Query Tool</h1>
                          <p className="mt-2 text-gray-600">
                            Select a database from the sidebar to get started.
                          </p>
                        </div>
                      }
                    />
                    <Route path="/dbs" element={<DatabaseListPage />} />
                    <Route path="/dbs/:id" element={<DatabaseDetailPage />} />
                    <Route path="/dbs/:id/query" element={<QueryPage />} />
                  </Routes>
                </ThemedLayout>
                <RefineKbar />
              </Refine>
            </AntdApp>
          </ConfigProvider>
        </RefineKbarProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
