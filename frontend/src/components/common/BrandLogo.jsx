import React from 'react'

/*
  Marca Kipu: cuerda madre + hebras anudadas (quipu andino que se lee como
  gráfico de barras). Fuente del asset: src/assets/brand/kipu-icon.svg
*/

export const KipuIcon = ({ size = 32, className = '' }) => (
  <svg
    viewBox="0 0 64 64"
    width={size}
    height={size}
    className={className}
    role="img"
    aria-label="Kipu"
  >
    <rect width="64" height="64" rx="14" fill="#3F7079" />
    <path d="M13 17 Q32 22 51 17" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" fill="none" />
    <line x1="20" y1="19.4" x2="20" y2="45" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
    <line x1="32" y1="20.6" x2="32" y2="36" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
    <line x1="44" y1="19.4" x2="44" y2="50" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
    <circle cx="20" cy="37" r="5" fill="#D4CBB0" />
    <circle cx="32" cy="29" r="5" fill="#A6C0B4" />
    <circle cx="44" cy="42" r="5" fill="#D4CBB0" />
  </svg>
)

/* Versión horizontal: símbolo + wordmark en la fuente display */
const BrandLogo = ({ iconSize = 32, className = '', textClassName = 'text-xl text-main' }) => (
  <span className={`inline-flex items-center gap-2.5 ${className}`}>
    <KipuIcon size={iconSize} />
    <span className={`font-display font-bold tracking-tight lowercase ${textClassName}`}>kipu</span>
  </span>
)

export default BrandLogo
