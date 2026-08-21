import { useEffect, useRef, useState } from 'react';
import type { Periodo } from '../lib/api';
import { CalendarIcon, ChevronDownIcon } from './icons';

const OPTIONS: { value: Periodo; label: string }[] = [
  { value: 7, label: 'Últimos 7 dias' },
  { value: 30, label: 'Últimos 30 dias' },
  { value: 90, label: 'Últimos 90 dias' },
];

interface PeriodFilterProps {
  value: Periodo;
  onChange: (value: Periodo) => void;
}

export default function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const current = OPTIONS.find((option) => option.value === value) ?? OPTIONS[0];

  return (
    <div className="period-filter" ref={wrapperRef}>
      <button type="button" className="period-chip" onClick={() => setOpen((isOpen) => !isOpen)}>
        <CalendarIcon />
        {current.label}
        <ChevronDownIcon />
      </button>
      {open && (
        <div className="period-menu">
          {OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              className={option.value === value ? 'period-option active' : 'period-option'}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
