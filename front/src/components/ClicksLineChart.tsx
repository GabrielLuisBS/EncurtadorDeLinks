import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { getSeriesGlobal, type Periodo, type SeriePonto } from '../lib/api';
import { formatShortDate, formatWeekday } from '../lib/format';
import { TrendingUpIcon } from './icons';

// Nome do dia da semana só faz sentido pro período de 7 dias (é o que o
// mockup mostra); em 30/90 dias repetiria "Seg, Ter, Qua..." várias vezes
// sem dizer qual semana, então vira dia/mês.
function formatTick(iso: string, periodo: Periodo): string {
  if (periodo === 7) {
    return formatWeekday(iso);
  }
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
}

// Espaça os rótulos do eixo X pra não empilhar 30/90 labels ilegíveis —
// mostra só ~6 nas séries mais longas (interval do Recharts pula N ticks
// entre cada rótulo exibido).
function tickInterval(periodo: Periodo): number | 'preserveStartEnd' {
  return periodo === 7 ? 0 : Math.ceil(periodo / 6) - 1;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: SeriePonto }>;
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-date">{formatShortDate(point.dia)}</div>
      <div className="chart-tooltip-value">{point.total} cliques</div>
    </div>
  );
}

interface ClicksLineChartProps {
  periodo: Periodo;
}

export default function ClicksLineChart({ periodo }: ClicksLineChartProps) {
  const [data, setData] = useState<SeriePonto[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(false);
    getSeriesGlobal(periodo)
      .then((series) => {
        if (!cancelled) setData(series);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [periodo]);

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-ico">
          <TrendingUpIcon />
        </div>
        <div className="panel-title">Cliques ao longo do tempo</div>
      </div>

      {error && <div className="panel-empty">Não foi possível carregar os cliques.</div>}
      {!error && data && data.length === 0 && (
        <div className="panel-empty">Nenhum clique registrado nesse período.</div>
      )}
      {!error && data && data.length > 0 && (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 16, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="clicksAreaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border-soft)" />
            <XAxis
              dataKey="dia"
              tickFormatter={(value: string) => formatTick(value, periodo)}
              interval={tickInterval(periodo)}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              tick={{ fill: 'var(--text-3)', fontSize: 12.5, fontWeight: 600 }}
              dy={8}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="total"
              stroke="var(--accent)"
              strokeWidth={3}
              fill="url(#clicksAreaFill)"
              dot={{ r: 4.5, fill: 'var(--surface)', stroke: 'var(--accent)', strokeWidth: 2.5 }}
              activeDot={{ r: 5.5, fill: 'var(--accent)', stroke: 'var(--surface)', strokeWidth: 2.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
