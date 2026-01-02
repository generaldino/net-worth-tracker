"use client"

export function NetWorthChart() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  
  // Sample data for stacked area chart
  const data = [
    { stocks: 80, savings: 45, crypto: 30, current: 25 },
    { stocks: 85, savings: 48, crypto: 35, current: 26 },
    { stocks: 92, savings: 50, crypto: 32, current: 28 },
    { stocks: 98, savings: 52, crypto: 38, current: 27 },
    { stocks: 105, savings: 55, crypto: 42, current: 30 },
    { stocks: 115, savings: 58, crypto: 45, current: 31 },
    { stocks: 125, savings: 62, crypto: 50, current: 33 },
    { stocks: 130, savings: 65, crypto: 48, current: 35 },
    { stocks: 138, savings: 68, crypto: 55, current: 36 },
    { stocks: 145, savings: 72, crypto: 58, current: 38 },
    { stocks: 148, savings: 74, crypto: 60, current: 40 },
    { stocks: 155, savings: 78, crypto: 62, current: 42 },
  ]

  const maxValue = Math.max(...data.map(d => d.stocks + d.savings + d.crypto + d.current))
  const chartHeight = 160
  const chartWidth = 300

  function getStackedPath(key: keyof typeof data[0], belowKeys: (keyof typeof data[0])[]) {
    const points: string[] = []
    const bottomPoints: string[] = []
    
    data.forEach((d, i) => {
      const x = (i / (data.length - 1)) * chartWidth
      const belowValue = belowKeys.reduce((sum, k) => sum + d[k], 0)
      const topValue = belowValue + d[key]
      const yTop = chartHeight - (topValue / maxValue) * chartHeight
      const yBottom = chartHeight - (belowValue / maxValue) * chartHeight
      
      points.push(`${x},${yTop}`)
      bottomPoints.unshift(`${x},${yBottom}`)
    })
    
    return `M${points.join(" L")} L${bottomPoints.join(" L")} Z`
  }

  return (
    <div className="w-full h-full p-4 flex flex-col">
      <svg className="w-full flex-1" viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="stocksGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(245 158 11)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="rgb(245 158 11)" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="savingsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="cryptoGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(249 115 22)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="rgb(249 115 22)" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="currentGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(59 130 246)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="rgb(59 130 246)" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <line
            key={i}
            x1="0"
            y1={chartHeight * ratio}
            x2={chartWidth}
            y2={chartHeight * ratio}
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeWidth="1"
          />
        ))}
        
        {/* Stacked areas */}
        <path d={getStackedPath("current", ["stocks", "savings", "crypto"])} fill="url(#currentGrad)" />
        <path d={getStackedPath("crypto", ["stocks", "savings"])} fill="url(#cryptoGrad)" />
        <path d={getStackedPath("savings", ["stocks"])} fill="url(#savingsGrad)" />
        <path d={getStackedPath("stocks", [])} fill="url(#stocksGrad)" />
        
        {/* X-axis labels */}
        {months.filter((_, i) => i % 3 === 0).map((month, i) => (
          <text
            key={month}
            x={(i * 3 / (data.length - 1)) * chartWidth}
            y={chartHeight + 16}
            fill="currentColor"
            opacity="0.5"
            fontSize="10"
            textAnchor="middle"
          >
            {month}
          </text>
        ))}
      </svg>
      
      {/* Legend */}
      <div className="flex justify-center gap-4 mt-2 flex-wrap">
        {[
          { label: "Stocks", color: "bg-amber-500" },
          { label: "Savings", color: "bg-emerald-500" },
          { label: "Crypto", color: "bg-orange-500" },
          { label: "Current", color: "bg-blue-500" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${item.color}`} />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

