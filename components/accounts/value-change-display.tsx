interface ValueChangeDisplayProps {
  absoluteChange: number;
  percentageChange: number;
  label?: string;
  className?: string;
}

export function ValueChangeDisplay({
  absoluteChange,
  percentageChange,
  label,
  className = "",
}: ValueChangeDisplayProps) {
  return (
    <div className={className}>
      {label && <span className="text-muted-foreground">{label}</span>}
      <div
        className={`font-medium ${
          absoluteChange >= 0 ? "text-green-600" : "text-red-600"
        }`}
      >
        {absoluteChange >= 0 ? "+" : ""}£{absoluteChange.toLocaleString()}
      </div>
      <div
        className={`text-xs ${
          percentageChange >= 0 ? "text-green-600" : "text-red-600"
        }`}
      >
        ({percentageChange >= 0 ? "+" : ""}
        {percentageChange.toFixed(1)}%)
      </div>
    </div>
  );
}
