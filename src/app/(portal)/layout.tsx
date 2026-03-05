import Sidebar from "@/components/sidebar";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background relative">
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full blur-3xl opacity-[0.07]"
          style={{ background: "linear-gradient(to bottom left, oklch(0.5 0.2 270), oklch(0.3 0.15 300))" }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full blur-3xl opacity-[0.05]"
          style={{ background: "linear-gradient(to top right, oklch(0.45 0.18 250), oklch(0.3 0.12 280))" }} />
      </div>

      <Sidebar />
      <main className="flex-1 p-8 relative z-10">{children}</main>
    </div>
  );
}
