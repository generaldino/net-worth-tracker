"use client"

export function SavingsRateChart() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  
  const data = [
    { income: 8500, spending: 5200, rate: 39 },
    { income: 8500, spending: 4800, rate: 44 },
    { income: 8500, spending: 5500, rate: 35 },
    { income: 9000, spending: 5100, rate: 43 },
    { income: 9000, spending: 4900, rate: 46 },
    { income: 9000, spending: 6200, rate: 31 },
    { income: 9500, spending: 5300, rate: 44 },
    { income: 9500, spending: 5000, rate: 47 },
    { income: 9500, spending: 5800, rate: 39 },
    { income: 10000, spending: 5400, rate: 46 },
    { income: 10000, spending: 5100, rate: 49 },
    { income: 10000, spending: 5200, rate: 48 },
  ]

  const chartHeight = 120
  const chartWidth = 300
  const maxRate = 60

  // Generate line path for savings rate
  const linePath = data.map((d, i) => {
    const x = (i / (data.length - 1)) * chartWidth
    const y = chartHeight - (d.rate / maxRate) * chartHeight
    return `${i === 0 ? 'M' : 'L'}${x},${y}`
  }).join(' ')

  // Generate area path
  const areaPath = `${linePath} L${chartWidth},${chartHeight} L0,${chartHeight} Z`

  return (
    <div className="w-full h-full p-4 flex flex-col">
      <svg className="w-full flex-1" viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="savingsRateGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        {/* Grid lines with labels */}
        {[0, 20, 40, 60].map((value) => {
          const y = chartHeight - (value / maxRate) * chartHeight
          return (
            <g key={value}>
              <line
                x1="0"
                y1={y}
                x2={chartWidth}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeWidth="1"
              />
              <text
                x="-5"
                y={y + 3}
                fill="currentColor"
                opacity="0.4"
                fontSize="8"
                textAnchor="end"
              >
                {value}%
              </text>
            </g>
          )
        })}
        
        {/* Area fill */}
        <path d={areaPath} fill="url(#savingsRateGrad)" />
        
        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="rgb(16 185 129)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Data points */}
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * chartWidth
          const y = chartHeight - (d.rate / maxRate) * chartHeight
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3"
              fill="rgb(16 185 129)"
              stroke="white"
              strokeWidth="1.5"
            />
          )
        })}
        
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
      
      {/* Stats */}
      <div className="flex justify-center gap-6 mt-2">
        <div className="text-center">
          <p className="text-lg font-bold text-emerald-600">42%</p>
          <p className="text-xs text-muted-foreground">Avg Rate</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">49%</p>
          <p className="text-xs text-muted-foreground">Best Month</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">£45.2K</p>
          <p className="text-xs text-muted-foreground">Total Saved</p>
        </div>
      </div>
    </div>
  )
}

