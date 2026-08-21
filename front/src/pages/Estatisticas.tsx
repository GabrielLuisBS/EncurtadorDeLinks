import { useState } from 'react';
import ClicksLineChart from '../components/ClicksLineChart';
import DeviceDonutChart from '../components/DeviceDonutChart';
import Navbar from '../components/Navbar';
import PeriodFilter from '../components/PeriodFilter';
import type { Periodo } from '../lib/api';

export default function Estatisticas() {
  const [periodo, setPeriodo] = useState<Periodo>(7);

  return (
    <div className="page">
      <Navbar />
      <div className="content">
        <div className="page-header">
          <div>
            <h1>Estatísticas</h1>
            <div className="subtitle">Acompanhe o desempenho dos seus links</div>
          </div>
          <PeriodFilter value={periodo} onChange={setPeriodo} />
        </div>

        <ClicksLineChart periodo={periodo} />

        {/* "Links mais acessados" (o painel que ficaria ao lado, no grid de
            2 colunas do mockup) foi adiado pra fase 11 — mesma decisão de
            privacidade do GET /links. O donut volta pro grid quando esse
            painel existir. */}
        <div className="stats-section">
          <DeviceDonutChart periodo={periodo} />
        </div>
      </div>
    </div>
  );
}
