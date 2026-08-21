import Hero from '../components/Hero';
import Navbar from '../components/Navbar';
import StatsSummary from '../components/StatsSummary';

export default function Home() {
  return (
    <div className="page">
      <Navbar />
      <Hero />
      <StatsSummary />
    </div>
  );
}
