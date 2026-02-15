import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import RunPlayground from './pages/RunPlayground';
import Experiments from './pages/Experiments';
import Prompts from './pages/Prompts';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/prompts" element={<Prompts />} />
          <Route path="/runs" element={<RunPlayground />} />
          <Route path="/experiments" element={<Experiments />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
