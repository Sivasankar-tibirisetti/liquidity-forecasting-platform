import { ArrowUpRight } from "lucide-react";

export default function StatCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{title}</span>
        <div className="stat-icon">
          {Icon && <Icon size={19} />}
        </div>
      </div>

      <div className="stat-value">{value}</div>

      <div className="stat-subtitle">
        <ArrowUpRight size={15} />
        {subtitle}
      </div>
    </div>
  );
}