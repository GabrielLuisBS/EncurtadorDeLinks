import { useState } from 'react';
import Hero from '../components/Hero';
import Navbar from '../components/Navbar';
import StatsSummary from '../components/StatsSummary';
import UltimosLinks from '../components/UltimosLinks';

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="page">
      <Navbar />
      <Hero onCreated={() => setRefreshKey((key) => key + 1)} />
      <StatsSummary />
      <UltimosLinks refreshKey={refreshKey} />
    </div>
  );
}
