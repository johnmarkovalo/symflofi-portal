import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/roles";
import OrderKeys from "./order-keys";
import RecordPayment from "./record-payment";
import Pagination from "@/components/pagination";

type OrderItem = {
  tier_label: string;
  quantity: number;
  bonus_quantity: number;
};

type OrderRow = {
  id: string;
  status: string;
  total_price_cents: number;
  amount_paid_cents: number;
  payment_method: string | null;
  payment_channel_type: string | null;
  paid_at: string | null;
  created_at: string;
  keys_generated: boolean;
  source: string;
  discount_pct: number;
  notes: string | null;
  license_order_items: OrderItem[];
  operators?: { name: string; email: string } | null;
};

function formatCurrency(cents: number) {
  return `₱${(cents / 100).toLocaleString()}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    failed: "bg-red-500/10 text-red-400 border-red-500/20",
    cancelled: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    credit: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    partially_paid: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };
  const labels: Record<string, string> = {
    partially_paid: "Partial",
  };
  const style = styles[status] ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border capitalize ${style}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function sourceBadge(source: string) {
  if (source === "admin") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
        Admin
      </span>
    );
  }
  return null;
}

function lineItemsSummary(items: OrderItem[]) {
  if (!items || items.length === 0) return "No items";
  return items
    .map((item) => {
      const total = item.quantity + (item.bonus_quantity ?? 0);
      const bonus = item.bonus_quantity > 0 ? ` (+${item.bonus_quantity})` : "";
      return `${item.tier_label} x${item.quantity}${bonus}`;
    })
    .join(", ");
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; perPage?: string }>;
}) {
  const ctx = await getUserContext();
  if (!ctx || !ctx.role) redirect("/signin");

  const params = await searchParams;
  const perPage = Math.min(100, Math.max(1, parseInt(params.perPage ?? "25")));
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const offset = (page - 1) * perPage;

  const supabase = await createClient();
  const isAdmin = ctx.role === "admin";

  let query = supabase
    .from("license_orders")
    .select(
      `id, status, total_price_cents, amount_paid_cents, payment_method, payment_channel_type, paid_at, created_at, keys_generated, source, discount_pct, notes,
       license_order_items (tier_label, quantity, bonus_quantity)${isAdmin ? ", operators (name, email)" : ""}`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (!isAdmin) {
    query = query.eq("operator_id", ctx.operatorId!);
  }

  const { data: orders, count, error } = await query;
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / perPage);

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Order History</h1>
        <p className="text-sm text-red-400">Failed to load orders. Please try again later.</p>
      </div>
    );
  }

  const typedOrders = (orders ?? []) as unknown as OrderRow[];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Order History</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin ? "All license purchase orders across operators" : "Your license purchase orders"}
        </p>
      </div>

      {typedOrders.length === 0 ? (
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-12 text-center">
          <svg
            className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
            />
          </svg>
          <p className="text-sm text-muted-foreground">No orders yet</p>
          {!isAdmin && (
            <p className="text-xs text-muted-foreground/60 mt-1">
              Purchase licenses from the License Store to see your orders here.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {typedOrders.map((order: OrderRow) => (
            <div
              key={order.id}
              className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-5"
            >
              {/* Order header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-mono text-muted-foreground">
                    #{order.id.slice(0, 8)}
                  </span>
                  {statusBadge(order.status)}
                  {sourceBadge(order.source)}
                  {order.keys_generated && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      Keys Generated
                    </span>
                  )}
                  {order.discount_pct > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {order.discount_pct}% off
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-foreground">
                    {formatCurrency(order.total_price_cents)}
                  </span>
                  {(order.status === "credit" || order.status === "partially_paid") && (
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(order.amount_paid_cents ?? 0)} paid / {formatCurrency(order.total_price_cents - (order.amount_paid_cents ?? 0))} remaining
                    </p>
                  )}
                </div>
              </div>

              {/* Order details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wide mb-0.5">
                    Date
                  </p>
                  <p className="text-foreground">
                    {formatDate(order.paid_at ?? order.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wide mb-0.5">
                    Payment
                  </p>
                  <p className="text-foreground capitalize">
                    {order.payment_method ?? "N/A"}
                    {order.payment_channel_type ? ` (${order.payment_channel_type})` : ""}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wide mb-0.5">
                    Items
                  </p>
                  <p className="text-foreground">
                    {lineItemsSummary(order.license_order_items)}
                  </p>
                </div>
              </div>

              {/* Admin: show operator */}
              {isAdmin && order.operators && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wide mb-0.5">
                    Operator
                  </p>
                  <p className="text-sm text-foreground">
                    {order.operators.name}{" "}
                    <span className="text-muted-foreground">({order.operators.email})</span>
                  </p>
                </div>
              )}

              {/* Notes */}
              {order.notes && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wide mb-0.5">
                    Notes
                  </p>
                  <p className="text-sm text-muted-foreground">{order.notes}</p>
                </div>
              )}

              {/* Credit payment recording */}
              {isAdmin && (order.status === "credit" || order.status === "partially_paid") && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <RecordPayment
                    orderId={order.id}
                    remainingCents={order.total_price_cents - (order.amount_paid_cents ?? 0)}
                  />
                </div>
              )}

              {/* Expandable keys section */}
              {order.keys_generated && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <OrderKeys orderId={order.id} />
                </div>
              )}
            </div>
          ))}
          <Pagination
            mode="server"
            currentPage={page}
            totalPages={totalPages}
            totalCount={totalCount}
            perPage={perPage}
          />
        </div>
      )}
    </div>
  );
}
