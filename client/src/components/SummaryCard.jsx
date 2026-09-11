/** Metric summary card used on Dashboard and Analytics. */
const SummaryCard = ({ title, value, icon: Icon, iconColor = "var(--ink-3)", iconBg = "var(--bg-subtle)", trend, trendType }) => {
  const trendColor =
    trendType === "positive" ? "var(--fin-green)" :
    trendType === "negative" ? "var(--fin-red)" :
    "var(--ink-3)";
  const trendBg =
    trendType === "positive" ? "var(--fin-green-bg)" :
    trendType === "negative" ? "var(--fin-red-bg)" :
    "var(--bg-subtle)";
  const trendBorder =
    trendType === "positive" ? "var(--fin-green-border)" :
    trendType === "negative" ? "var(--fin-red-border)" :
    "var(--border)";

  return (
    <div className="card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="section-label">{title}</span>
        {Icon && (
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: iconBg, color: iconColor,
            border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={16} />
          </div>
        )}
      </div>
      <div>
        <div className="metric-value">{value}</div>
        {trend && (
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            marginTop: 6,
            padding: "2px 7px",
            borderRadius: 5,
            fontSize: 11,
            fontWeight: 600,
            color: trendColor,
            background: trendBg,
            border: `1px solid ${trendBorder}`,
          }}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};

export default SummaryCard;
