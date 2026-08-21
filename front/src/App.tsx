import { Route, Routes } from 'react-router-dom';
import Entrar from './pages/Entrar';
import Estatisticas from './pages/Estatisticas';
import Home from './pages/Home';
import LinkDetalhe from './pages/LinkDetalhe';
import MeusLinks from './pages/MeusLinks';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/estatisticas" element={<Estatisticas />} />
      <Route path="/links/:slug" element={<LinkDetalhe />} />
      <Route path="/meus-links" element={<MeusLinks />} />
      <Route path="/entrar" element={<Entrar modo="entrar" />} />
      <Route path="/criar-conta" element={<Entrar modo="criar-conta" />} />
    </Routes>
  );
}

export default App;
