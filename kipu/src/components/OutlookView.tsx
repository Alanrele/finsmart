/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Mail, 
  Calendar as CalendarIcon, 
  RefreshCw, 
  CheckCircle2, 
  FileText, 
  ArrowRight, 
  Plus, 
  Clock, 
  ChevronRight,
  Sparkles,
  Link2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction } from '../types';

interface OutlookViewProps {
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  currencySymbol: string;
}

interface SimulatedEmail {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  synced: boolean;
  date: string;
}

export default function OutlookView({ onAddTransaction, currencySymbol }: OutlookViewProps) {
  const [emails, setEmails] = useState<SimulatedEmail[]>([
    {
      id: 'mail-1',
      sender: 'Luz del Sur S.A.A.',
      subject: 'Recibo Digital N° 458190 - Consumo de Energía',
      snippet: 'Estimado cliente, su recibo mensual de luz está disponible por un monto total de S/ 145.20 con vencimiento el 18/07.',
      amount: 145.20,
      type: 'expense',
      category: 'Servicios',
      synced: false,
      date: 'Ayer'
    },
    {
      id: 'mail-2',
      sender: 'Netflix Perú',
      subject: 'Confirmación de renovación de membresía',
      snippet: 'Gracias por ser miembro. Tu suscripción mensual de S/ 44.90 se renovará automáticamente el próximo 12/07.',
      amount: 44.90,
      type: 'expense',
      category: 'Entretenimiento',
      synced: false,
      date: 'Hace 2 días'
    },
    {
      id: 'mail-3',
      sender: 'Rimac Seguros S.A.',
      subject: 'Comprobante de Pago Electrónico - Plan de Salud',
      snippet: 'Se ha emitido el comprobante de su cuota mensual del seguro médico de S/ 210.00 correspondiente a Julio.',
      amount: 210.00,
      type: 'expense',
      category: 'Salud',
      synced: false,
      date: 'Hace 3 días'
    },
    {
      id: 'mail-4',
      sender: 'Universidad Peruana de Ciencias',
      subject: 'Aviso de vencimiento - Boleta de Pensión 3',
      snippet: 'Le recordamos que la boleta N° 03 por un importe de S/ 950.00 vence el 25/07.',
      amount: 950.00,
      type: 'expense',
      category: 'Educación',
      synced: false,
      date: 'Hace 4 días'
    }
  ]);

  const [activeTab, setActiveTab] = useState<'emails' | 'calendar'>('emails');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncedMessages, setSyncedMessages] = useState<string[]>([]);

  const handleSyncTransaction = async (email: SimulatedEmail) => {
    setSyncingId(email.id);
    
    // Simulate smart parsing delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    try {
      await onAddTransaction({
        description: `Recibo de: ${email.sender}`,
        amount: email.amount,
        date: new Date().toISOString().split('T')[0],
        category: email.category,
        type: email.type
      });

      // Update state
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, synced: true } : e));
      setSyncedMessages(prev => [...prev, `${email.sender} sincronizado con éxito.`]);
      
      // Auto-dismiss notification toast
      setTimeout(() => {
        setSyncedMessages(prev => prev.filter(msg => !msg.includes(email.sender)));
      }, 4000);

    } catch (err) {
      console.error(err);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-display tracking-tight text-main">Hub Outlook</h1>
          <p className="text-sm text-muted font-sans mt-1">Sincroniza tus facturas de correo y compromisos de calendario automáticamente</p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-base p-1 rounded-xl border border-subtle shadow-md">
          <button
            onClick={() => setActiveTab('emails')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'emails' 
                ? 'bg-brand-primary text-white dark:text-brand-dark shadow' 
                : 'text-main/70 dark:text-muted hover:text-main'
            }`}
          >
            Correos de Facturación
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'calendar' 
                ? 'bg-brand-primary text-white dark:text-brand-dark shadow' 
                : 'text-main/70 dark:text-muted hover:text-main'
            }`}
          >
            Eventos y Calendario
          </button>
        </div>
      </div>

      {/* Linked Account Indicator */}
      <div className="bg-card p-5 rounded-[2rem] border border-subtle flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-primary/10 text-brand-primary border border-brand-primary/15 rounded-2xl">
            <Link2 size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-main font-sans">Cuenta de Outlook Vinculada</h4>
            <p className="text-xs text-muted font-mono mt-0.5">kipu.user@outlook.com</p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-3 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full tracking-widest uppercase font-mono">
          ● Conectado
        </span>
      </div>

      {/* Sync Toasts */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2">
        <AnimatePresence>
          {syncedMessages.map((msg, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-brand-primary text-white dark:text-brand-dark text-xs font-bold px-4.5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 border border-brand-primary/20"
            >
              <CheckCircle2 className="text-white dark:text-brand-dark" size={16} />
              <span>{msg}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {activeTab === 'emails' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Email Inbox list */}
          <div className="lg:col-span-8 bg-card p-8 rounded-[2.5rem] border border-subtle shadow-xl space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-serif italic text-main">Bandeja de Entrada de Finanzas</h2>
              <span className="text-[10px] text-muted font-mono">Bandeja de entrada inteligente</span>
            </div>

            <div className="divide-y divide-subtle">
              {emails.map((email) => (
                <div key={email.id} className="py-4.5 flex gap-4 items-start group">
                  <div className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${
                    email.synced 
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                      : 'bg-base/50 text-muted border-subtle'
                  }`}>
                    <Mail size={18} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm font-bold text-main truncate group-hover:text-brand-primary transition-colors">{email.sender}</span>
                      <span className="text-[10px] text-muted font-mono shrink-0 pl-2">{email.date}</span>
                    </div>
                    <h4 className="text-xs font-semibold text-main mb-1.5">{email.subject}</h4>
                    <p className="text-xs text-muted line-clamp-2 leading-relaxed mb-3">{email.snippet}</p>

                    {/* Meta parsing details block */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-base/40 p-3 rounded-2xl border border-subtle">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[9px] font-bold px-2 py-0.5 bg-brand-primary/10 text-brand-primary border border-brand-primary/15 rounded-md uppercase tracking-wider font-mono">
                          {email.category}
                        </span>
                        <span className="text-xs font-extrabold text-main font-mono">
                          {currencySymbol} {email.amount.toFixed(2)}
                        </span>
                      </div>

                      {email.synced ? (
                        <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/10">
                          <CheckCircle2 size={12} />
                          <span>Sincronizado</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSyncTransaction(email)}
                          disabled={syncingId !== null}
                          className="flex items-center gap-1.5 bg-brand-primary hover:opacity-90 text-white dark:text-brand-dark text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all cursor-pointer shadow-md"
                        >
                          {syncingId === email.id ? (
                            <>
                              <RefreshCw size={11} className="animate-spin" />
                              <span>Analizando...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={11} />
                              <span>Sincronizar</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right sidebar info */}
          <div className="lg:col-span-4 bg-card p-8 rounded-[2.5rem] border border-subtle shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-5">
                <Sparkles size={20} className="text-brand-primary animate-pulse" />
                <h3 className="text-base font-serif italic text-main">Lectura de Kipu AI</h3>
              </div>
              <p className="text-xs text-main leading-relaxed space-y-4 font-sans">
                <span>
                  Kipu AI utiliza procesamiento de lenguaje natural de Gemini para examinar tus correos electrónicos de remitentes de confianza (proveedores de servicios, suscripciones, bancos).
                </span>
                <br /><br />
                <span>
                  Identifica montos, fechas de vencimiento e ítems de factura, permitiéndote cargarlos con solo un clic para que nunca tengas que rellenar formularios manuales.
                </span>
              </p>
            </div>
            
            <div className="p-4 bg-base/50 rounded-[2rem] border border-subtle mt-6 text-center">
              <span className="text-[10px] text-muted block font-mono">Siguiente Auditoría de Correo</span>
              <span className="text-sm font-semibold text-main block mt-1">Hoy en la noche, 10:00 PM</span>
            </div>
          </div>
        </div>
      ) : (
        /* Calendar commitments */
        <div className="bg-card p-8 rounded-[2.5rem] border border-subtle shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-serif italic text-main">Agenda Mensual de Compromisos</h2>
            <span className="text-[10px] text-muted font-mono">Próximos compromisos</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
            {/* Calendar card 1 */}
            <div className="bg-base/40 p-5 rounded-[2rem] border border-subtle relative overflow-hidden flex flex-col justify-between h-36 shadow-md">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-muted font-mono">12 DE JULIO</span>
                  <h4 className="text-sm font-bold text-main mt-1">Netflix Suscripción</h4>
                </div>
                <div className="p-2 bg-purple-500/10 text-purple-500 border border-purple-500/20 rounded-xl">
                  <Clock size={16} />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-main font-mono font-bold">S/ 44.90</span>
                <span className="text-[9px] font-bold text-muted uppercase tracking-wider">RENOVACIÓN AUTOMÁTICA</span>
              </div>
            </div>

            {/* Calendar card 2 */}
            <div className="bg-base/40 p-5 rounded-[2rem] border border-subtle relative overflow-hidden flex flex-col justify-between h-36 shadow-md">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-muted font-mono">18 DE JULIO</span>
                  <h4 className="text-sm font-bold text-main mt-1">Luz del Sur S.A.A.</h4>
                </div>
                <div className="p-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-xl">
                  <Clock size={16} />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-main font-mono font-bold">S/ 145.20</span>
                <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-wider">PAGO PENDIENTE</span>
              </div>
            </div>

            {/* Calendar card 3 */}
            <div className="bg-base/40 p-5 rounded-[2rem] border border-subtle relative overflow-hidden flex flex-col justify-between h-36 shadow-md">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-muted font-mono">25 DE JULIO</span>
                  <h4 className="text-sm font-bold text-main mt-1">Pensión UPC Boleta 3</h4>
                </div>
                <div className="p-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl">
                  <Clock size={16} />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-main font-mono font-bold">S/ 950.00</span>
                <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider">PAGO PENDIENTE</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
