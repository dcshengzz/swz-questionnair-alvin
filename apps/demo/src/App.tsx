import { Navigate, Route, Routes } from 'react-router-dom';
import DesignerRoute from './routes/DesignerRoute';
import PreviewRoute from './routes/PreviewRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/design" replace />} />
      <Route path="/design" element={<DesignerRoute />} />
      <Route path="/preview" element={<PreviewRoute />} />
    </Routes>
  );
}
