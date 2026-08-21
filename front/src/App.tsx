import { Route, Routes } from 'react-router-dom';
import Estatisticas from './pages/Estatisticas';
import Home from './pages/Home';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/estatisticas" element={<Estatisticas />} />
    </Routes>
  );
}

export default App;
