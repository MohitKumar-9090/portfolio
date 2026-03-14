import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Dashboard from './pages/Dashboard.jsx';
import SeoHead from './components/SeoHead.jsx';
import { useAppTracking } from './hooks/useAppTracking.js';
import IntroLoader from './intro/IntroLoader.jsx';

function App() {
  useAppTracking();
  const [entered, setEntered] = useState(false);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <>
            <SeoHead path="/" />
            {!entered ? <IntroLoader onEnter={() => setEntered(true)} /> : <Home />}
          </>
        }
      />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
