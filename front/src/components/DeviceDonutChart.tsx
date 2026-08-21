import { useEffect, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { getByDispositivoGlobal, type DispositivoPonto, type Periodo } from '../lib/api';
import { PieChartIcon } from './icons';

const DEVICE_ORDER = ['mobile', 'desktop', 'tablet', 'outro'];

const DEVICE_LABELS: Record<string, string> = {
  mobile: 'Mobile',
  desktop: 'Desktop',
  tablet: 'Tablet',
  outro: 'Outro',
};

// Mobile/Desktop/Tablet usam a família do acento (mesmo hue, lightness
// diferente — ver "Visão Geral do Design"). "Outro" não tem cor no design
// original (só 3 categorias no mockup); em vez de inventar uma 4ª cor da
// família do acento, usa um neutro — sinaliza "categoria residual" sem
// fabricar uma tonalidade que não existe no sistema.
const DEVICE_COLORS: Record<string, string> = {
  mobile: 'var(--accent)',
  desktop: 'var(--chart-2)',
  tablet: 'var(--chart-3)',
  outro: 'var(--text-3)',
};

const compactFormatter = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function colorFor(dispositivo: string): string {
  return DEVICE_COLORS[dispositivo] ?? 'var(--text-3)';
}

function labelFor(dispositivo: string): string {
  return DEVICE_LABELS[dispositivo] ?? dispositivo;
}

interface DeviceDonutChartProps {
  periodo: Periodo;
}

export default function DeviceDonutChart({ periodo }: DeviceDonutChartProps) {
  const [data, setData] = useState<DispositivoPonto[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(false);
    getByDispositivoGlobal(periodo)
      .then((rows) => {
        if (!cancelled) setData(rows);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [periodo]);

  const sorted = data
    ? [...data].sort((a, b) => DEVICE_ORDER.indexOf(a.dispositivo) - DEVICE_ORDER.indexOf(b.dispositivo))
    : [];
  const total = sorted.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-ico">
          <PieChartIcon />
        </div>
        <div className="panel-title">Distribuição por dispositivo</div>
      </div>

      {error && <div className="panel-empty">Não foi possível carregar a distribuição.</div>}
      {!error && data && total === 0 && (
        <div className="panel-empty">Nenhum clique registrado nesse período.</div>
      )}
      {!error && data && total > 0 && (
        <div className="donut-wrap">
          <div className="donut-figure">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie
                  data={sorted}
                  dataKey="total"
                  nameKey="dispositivo"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={82}
                  paddingAngle={2}
                  stroke="none"
                >
                  {sorted.map((item) => (
                    <Cell key={item.dispositivo} fill={colorFor(item.dispositivo)} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <div className="num">{compactFormatter.format(total)}</div>
              <div className="lbl">cliques</div>
            </div>
          </div>
          <div className="legend">
            {sorted.map((item) => (
              <div className="legend-item" key={item.dispositivo}>
                <span className="legend-dot" style={{ background: colorFor(item.dispositivo) }} />
                <span className="legend-label">{labelFor(item.dispositivo)}</span>
                <span className="legend-value">{Math.round((item.total / total) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
