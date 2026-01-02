"use client"

export function WealthGrowthChart() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  
  const data = [
    { savings: 3200, gains: 1800, interest: 450 },
    { savings: 3500, gains: 2200, interest: 480 },
    { savings: 3000, gains: 1500, interest: 510 },
    { savings: 3800, gains: 2800, interest: 540 },
    { savings: 4100, gains: 3200, interest: 570 },
    { savings: 2800, gains: -800, interest: 600 },
    { savings: 4200, gains: 3500, interest: 630 },
    { savings: 4500, gains: 2900, interest: 660 },
    { savings: 3700, gains: 2100, interest: 690 },
    { savings: 4600, gains: 4200, interest: 720 },
    { savings: 4900, gains: 3800, interest: 750 },
    { savings: 4800, gains: 4500, interest: 780 },
  ]

  const chartHeight = 130
  const chartWidth = 300
  const maxValue = Math.max(...data.map(d => d.savings + Math.max(0, d.gains) + d.interest))
  const minValue = Math.min(...data.map(d => Math.min(0, d.gains)))
  const range = maxValue - minValue
  const zeroY = chartHeight - ((0 - minValue) / range) * chartHeight
  const barWidth = 18

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
        
        {/* Zero line */}
        <line
          x1="0"
          y1={zeroY}
          x2={chartWidth}
          y2={zeroY}
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="1"
          strokeDasharray="4,4"
        />
        
        {/* Stacked bars */}
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * (chartWidth - barWidth)
          
          // Calculate bar positions
          const savingsHeight = (d.savings / range) * chartHeight
          const interestHeight = (d.interest / range) * chartHeight
          const gainsHeight = (Math.abs(d.gains) / range) * chartHeight
          
          const savingsY = zeroY - savingsHeight
          const interestY = savingsY - interestHeight
          
          return (
            <g key={i}>
              {/* Savings bar */}
              <rect
                x={x}
                y={savingsY}
                width={barWidth}
                height={savingsHeight}
                fill="rgb(59 130 246)"
                rx="2"
                opacity="0.8"
              />
              {/* Interest bar (stacked on top) */}
              <rect
                x={x}
                y={interestY}
                width={barWidth}
                height={interestHeight}
                fill="rgb(168 85 247)"
                rx="2"
                opacity="0.8"
              />
              {/* Gains bar (can be negative) */}
              {d.gains >= 0 ? (
                <rect
                  x={x}
                  y={interestY - gainsHeight}
                  width={barWidth}
                  height={gainsHeight}
                  fill="rgb(16 185 129)"
                  rx="2"
                  opacity="0.8"
                />
              ) : (
                <rect
                  x={x}
                  y={zeroY}
                  width={barWidth}
                  height={gainsHeight}
                  fill="rgb(239 68 68)"
                  rx="2"
                  opacity="0.8"
                />
              )}
            </g>
          )
        })}
        
        {/* X-axis labels */}
        {months.filter((_, i) => i % 3 === 0).map((month, i) => {
          const x = (i * 3 / (data.length - 1)) * (chartWidth - barWidth) + barWidth / 2
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
      <div className="flex justify-center gap-4 mt-2 flex-wrap">
        {[
          { label: "Savings", color: "bg-blue-500" },
          { label: "Interest", color: "bg-purple-500" },
          { label: "Gains", color: "bg-emerald-500" },
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

