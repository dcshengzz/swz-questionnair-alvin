import React from 'react';
import type { ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import { BrowserRouter } from 'react-router-dom';
import { useThemeMode } from '@qnn/designer';
import App from './App';
import 'antd/dist/reset.css';
import './styles.css';
import '@qnn/designer/style.css';

const fontStack =
  "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

function ThemedRoot({ children }: { children: ReactNode }) {
  const [mode] = useThemeMode();
  return (
    <ConfigProvider
      theme={{
        algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677FF',
          colorInfo: '#1677FF',
          colorBgLayout: mode === 'dark' ? '#0f1419' : '#f7f8fa',
          colorBorderSecondary: mode === 'dark' ? '#2a3142' : '#eceef3',
          borderRadius: 8,
          borderRadiusLG: 10,
          borderRadiusSM: 6,
          controlHeight: 34,
          fontFamily: fontStack,
          fontSize: 14,
          wireframe: false,
        },
        components: {
          Button: { controlHeight: 34, paddingInline: 14, fontWeight: 500 },
          Input: { controlHeight: 34 },
          Select: { controlHeight: 34 },
          Modal: { borderRadiusLG: 12 },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemedRoot>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemedRoot>
  </React.StrictMode>,
);
