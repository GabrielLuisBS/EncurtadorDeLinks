import { Route, Routes } from 'react-router-dom';
import Estatisticas from './pages/Estatisticas';
import Home from './pages/Home';
import LinkDetalhe from './pages/LinkDetalhe';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/estatisticas" element={<Estatisticas />} />
      <Route path="/links/:slug" element={<LinkDetalhe />} />
    </Routes>
  );
}

export default App;
