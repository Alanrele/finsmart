/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Settings, 
  User, 
  Download, 
  Trash2, 
  Award, 
  HelpCircle, 
  ShieldCheck, 
  Globe 
} from 'lucide-react';
import { motion } from 'motion/react';
import { Transaction } from '../types';

interface SettingsViewProps {
  currencySymbol: string;
  setCurrencySymbol: (symbol: string) => void;
  onClearData: () => Promise<void>;
  transactions: Transaction[];
}

export default function SettingsView({
  currencySymbol,
  setCurrencySymbol,
  onClearData,
  transactions
}: SettingsViewProps) {

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    
    const headers = ['ID', 'Descripción', 'Monto', 'Fecha', 'Categoría', 'Tipo'];
    const rows = transactions.map(t => [
      t.id, 
      t.description, 
      t.amount, 
      t.date, 
      t.category, 
      t.type
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `kipu_reporte_financiero_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div 
      className="space-y-6 max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold font-display tracking-tight text-main">Configuración</h1>
        <p className="text-sm text-muted font-sans mt-1">Ajusta tus parámetros regionales, de seguridad y exportación de datos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* User profile card (Kipu Premium Account) */}
        <div className="md:col-span-4 bg-card p-6 rounded-[2rem] border border-subtle shadow-xl text-center flex flex-col justify-between items-center min-h-[300px]">
          <div className="w-full flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/15 flex items-center justify-center mb-4">
              <User size={28} />
            </div>
            <h3 className="text-sm font-bold text-main">Kipu Demo User</h3>
            <span className="text-[10px] text-muted font-mono mt-0.5">MEMBER SINCE 2026</span>

            <div className="mt-4 px-4 py-1.5 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-full text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 shadow-sm">
              <Award size={14} />
              <span>Socio Platinum</span>
            </div>
          </div>

          <div className="w-full border-t border-subtle pt-4 text-left space-y-2 text-xs text-muted">
            <div className="flex justify-between">
              <span>Soporte prioritario:</span>
              <span className="text-emerald-500 font-bold font-mono">ACTIVO</span>
            </div>
            <div className="flex justify-between">
              <span>Auditorías IA:</span>
              <span className="text-main font-mono">ILIMITADAS</span>
            </div>
          </div>
        </div>

        {/* Configurations panel */}
        <div className="md:col-span-8 bg-card p-8 rounded-[2.5rem] border border-subtle shadow-xl space-y-6">
          
          {/* Regional currency */}
          <div className="space-y-3">
            <h3 className="text-sm font-serif italic text-main border-b border-subtle pb-2 flex items-center gap-2">
              <Globe size={16} className="text-brand-primary" />
              <span>Moneda de Preferencia</span>
            </h3>
            <p className="text-xs text-muted leading-relaxed mb-3">
              Selecciona el símbolo monetario utilizado para dar formato a tus transacciones, metas de ahorro y reportes Kipu AI.
            </p>
            <div className="flex bg-base/60 p-1 border border-subtle rounded-xl max-w-sm">
              {[
                { label: 'Soles (S/)', value: 'S/' },
                { label: 'Dólares ($)', value: '$' },
                { label: 'Euros (€)', value: '€' }
              ].map((cur) => (
                <button
                  key={cur.value}
                  onClick={() => setCurrencySymbol(cur.value)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currencySymbol === cur.value 
                      ? 'bg-brand-primary text-white dark:text-brand-dark shadow-sm' 
                      : 'text-main/70 dark:text-muted hover:text-main'
                  }`}
                >
                  {cur.label}
                </button>
              ))}
            </div>
          </div>

          {/* Backup and export */}
          <div className="space-y-3 pt-4">
            <h3 className="text-sm font-serif italic text-main border-b border-subtle pb-2 flex items-center gap-2">
              <Download size={16} className="text-brand-primary" />
              <span>Respaldar y Exportar</span>
            </h3>
            <p className="text-xs text-muted leading-relaxed mb-4">
              Descarga una copia completa de tus registros financieros organizados en formato CSV para poder examinarlos en Microsoft Excel, Google Sheets, etc.
            </p>
            <button
              onClick={handleExportCSV}
              disabled={transactions.length === 0}
              className="flex items-center gap-2 bg-brand-primary hover:opacity-90 disabled:opacity-40 text-white dark:text-brand-dark font-bold text-xs uppercase tracking-wide px-5 py-2.5 rounded-full shadow-lg transition-all cursor-pointer"
            >
              <Download size={14} />
              <span>Exportar Transacciones (CSV)</span>
            </button>
          </div>

          {/* Destructive Actions */}
          <div className="space-y-3 pt-4">
            <h3 className="text-sm font-serif italic text-rose-500 border-b border-subtle pb-2 flex items-center gap-2">
              <Trash2 size={16} />
              <span>Zonas de Peligro</span>
            </h3>
            <p className="text-xs text-muted leading-relaxed mb-4">
              Restablece la base de datos de transacciones de Kipu para eliminar los registros de prueba y comenzar tu contabilidad personal desde cero. Esta acción es irreversible.
            </p>
            <button
              onClick={() => {
                if (window.confirm("¿Estás absolutamente seguro de que deseas eliminar todas las transacciones y metas de ahorro? Esta acción no se puede deshacer.")) {
                  onClearData();
                }
              }}
              className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 font-bold text-xs uppercase tracking-wide px-5 py-2.5 rounded-full transition-all cursor-pointer"
            >
              <Trash2 size={14} />
              <span>Borrar Base de Datos Completa</span>
            </button>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
