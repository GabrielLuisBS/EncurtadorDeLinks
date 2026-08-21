import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { getLinkSeries, type SeriePonto } from '../lib/api';
import { formatShortDate, formatWeekday } from '../lib/format';

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

interface MiniClicksChartProps {
  slug: string;
}

/** Versão compacta do ClicksLineChart, pro painel "Cliques nos últimos
 * 7 dias" da tela de detalhe — fixa em 7 dias, sem os pontos marcadores
 * (o mockup mostra só a linha + área nesse tamanho reduzido). */
export default function MiniClicksChart({ slug }: MiniClicksChartProps) {
  const [data, setData] = useState<SeriePonto[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getLinkSeries(slug, 7)
      .then((series) => {
        if (!cancelled) setData(series);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return <div className="panel-empty">Não foi possível carregar os cliques.</div>;
  }
  if (data && data.length === 0) {
    return <div className="panel-empty">Nenhum clique registrado nesse período.</div>;
  }
  if (!data) {
    return null;
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="miniAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border-soft)" />
        <XAxis
          dataKey="dia"
          tickFormatter={formatWeekday}
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
          tick={{ fill: 'var(--text-3)', fontSize: 12, fontWeight: 600 }}
          dy={6}
        />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="total"
          stroke="var(--accent)"
          strokeWidth={3}
          fill="url(#miniAreaFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
