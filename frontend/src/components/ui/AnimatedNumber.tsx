import React, { useEffect, useRef, useState } from 'react'

/*
  Número que anima su valor con easing (cuenta desde el valor anterior al
  nuevo). Respeta prefers-reduced-motion: en ese caso salta directo al valor.
  Uso: <AnimatedNumber value={1234.5} format={(n) => formatCurrency(n)} />
*/
const AnimatedNumber = ({
  value,
  format = (n: number) => String(Math.round(n)),
  duration = 700,
}: {
  value: number
  format?: (n: number) => string
  duration?: number
}) => {
  const safeValue = Number.isFinite(value) ? value : 0
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      fromRef.current = safeValue
      setDisplay(safeValue)
      return
    }

    const from = fromRef.current
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cúbico
      setDisplay(from + (safeValue - from) * eased)
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        fromRef.current = safeValue
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [safeValue, duration])

  return <>{format(display)}</>
}

export default AnimatedNumber
