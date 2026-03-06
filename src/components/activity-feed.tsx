type Activity = {
  id: string;
  event_type: string;
  description: string;
  created_at: string;
};

const eventIcons: Record<string, { icon: string; color: string }> = {
  machine_online: { icon: "M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728", color: "text-emerald-400" },
  machine_offline: { icon: "M18.364 5.636a9 9 0 010 12.728M5.636 5.636l12.728 12.728", color: "text-zinc-500" },
  license_activated: { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-emerald-400" },
  license_generated: { icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z", color: "text-purple-400" },
  request_approved: { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-indigo-400" },
  request_denied: { icon: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-red-400" },
};

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ActivityFeed({ activities }: { activities: Activity[] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6">
        <h3 className="text-sm font-medium text-foreground mb-4">Recent Activity</h3>
        <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6">
      <h3 className="text-sm font-medium text-foreground mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity) => {
          const iconData = eventIcons[activity.event_type] ?? { icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-zinc-400" };
          return (
            <div key={activity.id} className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                <svg className={`w-4 h-4 ${iconData.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={iconData.icon} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{activity.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(activity.created_at)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
