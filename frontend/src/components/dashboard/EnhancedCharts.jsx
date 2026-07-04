import React, { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Sector
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

// Paleta oficial centralizada (misma fuente que tailwind.config.js — DOC/GUIA_DE_ESTILO.md)
const PALETTE = {
  primary: '#3F7079',      // azul petróleo — primario / balance
  primaryLight: '#63929B',
  primaryDark: '#2B4D54',
  sage: '#A6C0B4',         // verde salvia — ingresos / positivo
  sageDark: '#658876',
  taupe: '#A79E82',        // taupe — gastos / secundario
  taupeDark: '#8C8368',
  sand: '#D4CBB0',         // arena — superficies / series suaves
};

const COLORS = [
  PALETTE.primary,
  PALETTE.sage,
  PALETTE.taupe,
  PALETTE.sand,
  PALETTE.primaryLight,
  PALETTE.sageDark,
  PALETTE.taupeDark,
  PALETTE.primaryDark,
];

// Error Boundary para charts
class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error('Chart error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-64 text-zinc-500">
          No se pudo renderizar el gráfico
        </div>
      );
    }
    return this.props.children;
  }
}

// Custom Tooltip mejorado
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700">
        <p className="font-semibold text-zinc-900 dark:text-white mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              {entry.name}: {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Gráfico de dona 3D mejorado
export const Enhanced3DDonutChart = ({ data, title }) => {
  const [activeIndex, setActiveIndex] = useState(-1);
  const chartRef = React.useRef(null);

  const onPieEnter = (_, index) => setActiveIndex(index);
  const onPieLeave = () => setActiveIndex(-1);

  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    );
  };

  return (
    <div ref={chartRef} className="relative">
      {title && (
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">{title}</h3>
      )}
      <ChartErrorBoundary>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <defs>
              {COLORS.map((color, index) => (
                <linearGradient key={index} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={1} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                </linearGradient>
              ))}
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                <feOffset dx="0" dy="4" result="offsetblur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.4" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              dataKey="value"
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              isAnimationActive={false}
              label={(entry) => `${entry.name} ${((entry.value / data.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}%`}
              labelLine={true}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#gradient-${index % COLORS.length})`}
                  filter="url(#shadow)"
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartErrorBoundary>
    </div>
  );
};

// Gráfico de barras con gradientes
export const EnhancedBarChart = ({ data, title, dataKey = 'value' }) => {
  const chartRef = React.useRef(null);

  return (
    <div ref={chartRef} className="relative">
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{title}</h3>
        </div>
      )}
      <ChartErrorBoundary>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PALETTE.primary} stopOpacity={1} />
                <stop offset="100%" stopColor={PALETTE.primaryDark} stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="name"
              tick={{ fill: '#666' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fill: '#666' }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey={dataKey}
              fill="url(#barGradient)"
              radius={[8, 8, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartErrorBoundary>
    </div>
  );
};

// Gráfico de área para ingresos vs gastos
export const IncomeExpenseAreaChart = ({ data, title }) => {
  const chartRef = React.useRef(null);

  return (
    <div ref={chartRef} className="relative">
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{title}</h3>
        </div>
      )}
      <ChartErrorBoundary>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={PALETTE.sageDark} stopOpacity={0.8} />
                <stop offset="95%" stopColor={PALETTE.sageDark} stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={PALETTE.taupe} stopOpacity={0.8} />
                <stop offset="95%" stopColor={PALETTE.taupe} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="month" tick={{ fill: '#666' }} />
            <YAxis tick={{ fill: '#666' }} tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="income"
              stroke={PALETTE.sageDark}
              fillOpacity={1}
              fill="url(#incomeGradient)"
              name="Ingresos"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="expense"
              stroke={PALETTE.taupe}
              fillOpacity={1}
              fill="url(#expenseGradient)"
              name="Gastos"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="balance"
              stroke={PALETTE.primary}
              strokeWidth={3}
              name="Balance"
              isAnimationActive={false}
              dot={{ fill: PALETTE.primary, r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartErrorBoundary>
    </div>
  );
};

// Gráfico de radar para salud financiera
export const FinancialHealthRadar = ({ data, title }) => {
  return (
    <div className="relative">
      {title && (
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">{title}</h3>
      )}
      <ChartErrorBoundary>
        <ResponsiveContainer width="100%" height={350}>
          <RadarChart data={data}>
            <defs>
              <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PALETTE.primary} stopOpacity={0.8} />
                <stop offset="100%" stopColor={PALETTE.sage} stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <PolarGrid stroke="#e0e0e0" />
            <PolarAngleAxis dataKey="category" tick={{ fill: '#666', fontSize: 12 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#666' }} />
            <Radar
              name="Salud Financiera"
              dataKey="score"
              stroke={PALETTE.primary}
              fill="url(#radarGradient)"
              fillOpacity={0.6}
              isAnimationActive={false}
            />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </ChartErrorBoundary>
    </div>
  );
};

// Comparación Mes vs Mes
export const MonthOverMonthComparison = ({ currentMonth, previousMonth, title }) => {
  const comparisonData = [
    {
      name: 'Mes Anterior',
      gastos: previousMonth.expenses || 0,
      ingresos: previousMonth.income || 0,
      balance: previousMonth.balance || 0
    },
    {
      name: 'Mes Actual',
      gastos: currentMonth.expenses || 0,
      ingresos: currentMonth.income || 0,
      balance: currentMonth.balance || 0
    }
  ];

  const changePercentage = ((currentMonth.expenses - previousMonth.expenses) / previousMonth.expenses * 100).toFixed(1);
  const isIncrease = changePercentage > 0;

  return (
    <div className="relative">
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{title}</h3>
          <div className="flex items-center space-x-2 mt-2">
            {isIncrease ? (
              <TrendingUp className="w-5 h-5 text-red-500" />
            ) : (
              <TrendingDown className="w-5 h-5 text-green-500" />
            )}
            <span className={`text-sm font-medium ${isIncrease ? 'text-red-500' : 'text-green-500'}`}>
              {isIncrease ? '+' : ''}{changePercentage}% vs mes anterior
            </span>
          </div>
        </div>
      )}
      <ChartErrorBoundary>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={comparisonData}>
            <defs>
              <linearGradient id="gastosGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PALETTE.taupe} stopOpacity={1} />
                <stop offset="100%" stopColor={PALETTE.taupe} stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="ingresosGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PALETTE.sageDark} stopOpacity={1} />
                <stop offset="100%" stopColor={PALETTE.sageDark} stopOpacity={0.7} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="name" tick={{ fill: '#666' }} />
            <YAxis tick={{ fill: '#666' }} tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="ingresos" fill="url(#ingresosGrad)" radius={[8, 8, 0, 0]} name="Ingresos" isAnimationActive={false} />
            <Bar dataKey="gastos" fill="url(#gastosGrad)" radius={[8, 8, 0, 0]} name="Gastos" isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </ChartErrorBoundary>
    </div>
  );
};

export default {
  Enhanced3DDonutChart,
  EnhancedBarChart,
  IncomeExpenseAreaChart,
  FinancialHealthRadar,
  MonthOverMonthComparison
};
