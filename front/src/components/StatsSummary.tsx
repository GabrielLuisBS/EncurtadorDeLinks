import { useEffect, useState } from 'react';
import { getResumo, type Resumo } from '../lib/api';
import { ClickIcon, LinkIcon } from './icons';

const numberFormatter = new Intl.NumberFormat('pt-BR');

export default function StatsSummary() {
  const [resumo, setResumo] = useState<Resumo | null>(null);

  useEffect(() => {
    let cancelled = false;
    getResumo()
      .then((data) => {
        if (!cancelled) setResumo(data);
      })
      .catch(() => {
        // Falha ao carregar: a seção simplesmente não aparece, em vez de
        // mostrar um número inventado no lugar do real.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!resumo) return null;

  return (
    <div className="stats-summary">
      <div className="stat-card">
        <div className="icon-circle">
          <LinkIcon size={20} />
        </div>
        <div className="stat-number">{numberFormatter.format(resumo.totalLinks)}</div>
        <div className="stat-label">Links criados</div>
      </div>
      <div className="stat-card">
        <div className="icon-circle">
          <ClickIcon size={20} />
        </div>
        <div className="stat-number">{numberFormatter.format(resumo.totalCliques)}</div>
        <div className="stat-label">Cliques</div>
      </div>
      {/* O card "Usuários" do mockup fica de fora de propósito:
          GET /stats/resumo não devolve esse campo até a fase 11 existir
          de verdade (tabela Usuario) — ver Roteiro de Execução. Nada de
          renderizar um terceiro card com número inventado. */}
    </div>
  );
}
