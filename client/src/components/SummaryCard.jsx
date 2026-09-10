const SummaryCard = ({
  title,
  amount,
  icon,
  colorClass = "bg-indigo-50 text-indigo-600 border-indigo-100",
  trend,
  trendType = "neutral",
}) => {
  const getTrendBadge = () => {
    if (!trend) return null;

    const baseStyle = "summary-trend inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border";

    if (trendType === "positive") {
      return (
        <span className={`${baseStyle} is-positive`}>
          {trend}
        </span>
      );
    }
    if (trendType === "negative") {
      return (
        <span className={`${baseStyle} is-negative`}>
          {trend}
        </span>
      );
    }
    return (
      <span
        className={`${baseStyle} is-neutral`}
      >
        {trend}
      </span>
    );
  };

  return (
    <div className="glass-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between hover-lift relative overflow-hidden group stagger-item">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-4">
        <span className="summary-label text-[11px] font-bold uppercase tracking-widest">
          {title}
        </span>
        <div
          className={`summary-icon w-10 h-10 rounded-xl flex items-center justify-center border group-hover:scale-110 transition-transform ${colorClass}`}
        >
          {icon}
        </div>
      </div>

      {/* Amount */}
      <div>
        <h2 className="summary-amount text-2xl sm:text-[28px] font-extrabold mb-2 font-mono">
          {amount}
        </h2>
        <div className="flex items-center gap-2">{getTrendBadge()}</div>
      </div>
    </div>
  );
};

export default SummaryCard;
