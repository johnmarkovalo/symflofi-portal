type StatCardProps = {
  label: string;
  value: number | string;
  subtitle?: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
};

export default function StatCard({ label, value, subtitle, icon, color, bg, border }: StatCardProps) {
  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-4 sm:p-6 relative overflow-hidden group hover:border-border/80 transition-all">
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity ${bg}`} />
      <div className="relative z-10">
        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${bg} border ${border} mb-4`}>
          <svg className={`w-5 h-5 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
