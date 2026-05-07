import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Dashboard from './pages/Dashboard.jsx';
import SeoHead from './components/SeoHead.jsx';
import { useAppTracking } from './hooks/useAppTracking.js';

function App() {
  useAppTracking();

  return (
    <Routes>
      <Route
        path="/"
        element={
          <>
            <SeoHead path="/" />
            <Home />
          </>
        }
      />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
