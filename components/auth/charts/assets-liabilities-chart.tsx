"use client"

export function AssetsLiabilitiesChart() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  
  const data = [
    { assets: 320, liabilities: 85 },
    { assets: 335, liabilities: 82 },
    { assets: 350, liabilities: 78 },
    { assets: 362, liabilities: 75 },
    { assets: 380, liabilities: 72 },
    { assets: 395, liabilities: 68 },
    { assets: 415, liabilities: 65 },
    { assets: 428, liabilities: 62 },
    { assets: 445, liabilities: 58 },
    { assets: 460, liabilities: 55 },
    { assets: 478, liabilities: 52 },
    { assets: 495, liabilities: 48 },
  ]

  const maxValue = Math.max(...data.map(d => d.assets))
  const chartHeight = 140
  const chartWidth = 300
  const barWidth = 18
  const gap = 6

  return (
    <div className="w-full h-full p-4 flex flex-col">
      <svg className="w-full flex-1" viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`} preserveAspectRatio="xMidYMid meet">
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
        
        {/* Bars */}
        {data.map((d, i) => {
          const groupWidth = barWidth * 2 + gap
          const groupX = (i / (data.length - 1)) * (chartWidth - groupWidth)
          const assetHeight = (d.assets / maxValue) * chartHeight
          const liabilityHeight = (d.liabilities / maxValue) * chartHeight
          
          return (
            <g key={i}>
              {/* Asset bar */}
              <rect
                x={groupX}
                y={chartHeight - assetHeight}
                width={barWidth}
                height={assetHeight}
                fill="rgb(16 185 129)"
                rx="2"
                opacity="0.8"
              />
              {/* Liability bar */}
              <rect
                x={groupX + barWidth + gap}
                y={chartHeight - liabilityHeight}
                width={barWidth}
                height={liabilityHeight}
                fill="rgb(239 68 68)"
                rx="2"
                opacity="0.8"
              />
            </g>
          )
        })}
        
        {/* X-axis labels */}
        {months.filter((_, i) => i % 3 === 0).map((month, i) => {
          const groupWidth = barWidth * 2 + gap
          const x = (i * 3 / (data.length - 1)) * (chartWidth - groupWidth) + groupWidth / 2
          return (
            <text
              key={month}
              x={x}
              y={chartHeight + 16}
              fill="currentColor"
              opacity="0.5"
              fontSize="10"
              textAnchor="middle"
            >
              {month}
            </text>
          )
        })}
      </svg>
      
      {/* Legend */}
      <div className="flex justify-center gap-6 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground">Assets</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs text-muted-foreground">Liabilities</span>
        </div>
      </div>
    </div>
  )
}

