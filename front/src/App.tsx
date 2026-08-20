import Hero from './components/Hero';
import Navbar from './components/Navbar';
import StatsSummary from './components/StatsSummary';
import './App.css';

function App() {
  return (
    <div className="page">
      <Navbar />
      <Hero />
      <StatsSummary />
    </div>
  );
}

export default App;
