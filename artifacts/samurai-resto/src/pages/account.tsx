import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw, ShoppingBag, Clock, CheckCircle2, RotateCcw,
  ChevronDown, ChevronUp, MapPin, Package, Mail, User,
  UserPlus, ArrowLeft, Phone,
} from "lucide-react";
import type { MenuItem } from "@workspace/api-client-react";
import {
  displayName,
  loadCheckoutProfile,
  loadOrderIds,
  type CheckoutProfile,
} from "@/lib/checkoutStorage";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface PastOrder {
  id: string;
  customerName: string;
  orderType: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  createdAt: string;
  deliveryAddress: string | null;
  lines: Array<{
    id: string;
    menuItemId: string;
    menuItemName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    specialInstructions: string | null;
  }>;
}

const STATUS_STYLES: Record<string, { label: string; dot: string }> = {
  pending:   { label: "Pending",   dot: "bg-yellow-400" },
  preparing: { label: "Preparing", dot: "bg-blue-400" },
  ready:     { label: "Ready",     dot: "bg-green-400" },
  completed: { label: "Completed", dot: "bg-muted-foreground" },
  cancelled: { label: "Cancelled", dot: "bg-red-400" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function Field({ label, icon: Icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; icon: React.ElementType }) {
  return (
    <div>
      <label className="text-sm font-semibold text-foreground block mb-2">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          className="w-full h-12 bg-background border border-border rounded-lg pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          {...props}
        />
      </div>
    </div>
  );
}

function OrderCard({ order, onReorder }: { order: PastOrder; onReorder: (o: PastOrder) => void }) {
  const [expanded, setExpanded] = useState(false);
  const style  = STATUS_STYLES[order.status] ?? STATUS_STYLES.pending;
  const preview = order.lines.slice(0, 2);
  const extra   = order.lines.length - preview.length;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-4 flex items-start gap-3 border-b border-border bg-muted/20">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-sm font-bold text-foreground">#{order.id.substring(0, 8).toUpperCase()}</span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
              {style.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {fmtDate(order.createdAt)} · {fmtTime(order.createdAt)}
            <span className="mx-1.5">·</span>
            {order.orderType === "pickup" ? "🥡 Pickup" : "🛵 Delivery"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-primary text-lg">${order.total.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">{order.lines.length} item{order.lines.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="px-5 py-3">
        <div className="space-y-1.5">
          {(expanded ? order.lines : preview).map(line => (
            <div key={line.id} className="flex items-center gap-2 text-sm">
              <span className="text-primary font-bold min-w-[1.25rem] text-center">{line.quantity}×</span>
              <span className="text-foreground flex-1 truncate">{line.menuItemName}</span>
              <span className="text-muted-foreground">${line.subtotal.toFixed(2)}</span>
            </div>
          ))}
          {!expanded && extra > 0 && (
            <button onClick={() => setExpanded(true)} className="text-xs text-primary hover:underline flex items-center gap-1">
              <ChevronDown className="h-3 w-3" /> +{extra} more item{extra !== 1 ? "s" : ""}
            </button>
          )}
          {expanded && order.lines.length > 2 && (
            <button onClick={() => setExpanded(false)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <ChevronUp className="h-3 w-3" /> Show less
            </button>
          )}
        </div>
        {order.deliveryAddress && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{order.deliveryAddress}</span>
          </div>
        )}
      </div>

      <div className="px-5 pb-4">
        <Button
          onClick={() => onReorder(order)}
          className="w-full bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/30 hover:border-primary font-semibold gap-2 transition-all"
          variant="outline"
        >
          <RotateCcw className="h-4 w-4" /> Reorder This
        </Button>
      </div>
    </div>
  );
}

type Step = "dashboard" | "register";

export default function Account() {
  const { addItem, setIsCartOpen } = useCart();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("dashboard");
  const [tenantId, setTenantId] = useState("default");
  const [profile, setProfile] = useState<CheckoutProfile | null>(null);
  const [orders, setOrders] = useState<PastOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const configRes = await fetch(`${API_BASE}/api/config/checkout`);
        const config = await configRes.json() as { tenantId?: string };
        const tid = config.tenantId ?? "default";
        setTenantId(tid);
        const saved = loadCheckoutProfile(tid);
        setProfile(saved);
        if (saved) {
          setRegFirstName(saved.firstName);
          setRegLastName(saved.lastName ?? "");
          setRegPhone(saved.customerPhone);
          setRegEmail(saved.customerEmail ?? "");
        }

        const orderIds = loadOrderIds();
        if (orderIds.length > 0) {
          const res = await fetch(`${API_BASE}/api/account/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderIds }),
          });
          const data = await res.json() as { orders?: PastOrder[] };
          setOrders(data.orders ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleRegister = async () => {
    if (!regFirstName.trim()) { setRegError("First name is required."); return; }
    if (regEmail && !/\S+@\S+\.\S+/.test(regEmail)) { setRegError("Please enter a valid email."); return; }
    if (regPhone.replace(/\D/g, "").length < 7) { setRegError("Valid phone required."); return; }

    setRegLoading(true);
    setRegError("");
    try {
      const res = await fetch(`${API_BASE}/api/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: regFirstName.trim(),
          lastName: regLastName.trim() || null,
          phone: regPhone.trim(),
          email: regEmail.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 409) {
        setRegError(data.error ?? "Registration failed.");
        return;
      }
      toast({ title: "You're on the list! 🎉", description: "We'll send promos to your email when available." });
      setStep("dashboard");
    } catch {
      setRegError("Cannot connect to server.");
    } finally {
      setRegLoading(false);
    }
  };

  const handleReorder = (order: PastOrder) => {
    for (const line of order.lines) {
      const mockItem: MenuItem = {
        id: line.menuItemId, sku: line.menuItemId, name: line.menuItemName,
        price: line.unitPrice, category: "", description: null, imageUrl: null,
        available: true, featured: false,
      };
      addItem(mockItem, line.quantity, line.specialInstructions ?? undefined);
    }
    toast({ title: "Added to Cart! 🛒", description: `${order.lines.length} item${order.lines.length !== 1 ? "s" : ""} added from your previous order.` });
    setIsCartOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (step === "register") {
    return (
      <div className="bg-background min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-md">
          <button onClick={() => setStep("dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UserPlus className="h-7 w-7 text-primary" />
            </div>
            <h1 className="font-serif text-3xl text-foreground mb-2">Join Our List</h1>
            <p className="text-muted-foreground text-sm">
              Get exclusive promos. Your checkout details stay private on this device.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name *" icon={User} type="text" value={regFirstName}
                onChange={e => setRegFirstName(e.target.value)} placeholder="Sri" />
              <Field label="Last Name" icon={User} type="text" value={regLastName}
                onChange={e => setRegLastName(e.target.value)} placeholder="Optional" />
            </div>
            <Field label="Phone *" icon={Phone} type="tel" value={regPhone}
              onChange={e => setRegPhone(e.target.value)} placeholder="(765) 555-1234" />
            <Field label="Email" icon={Mail} type="email" value={regEmail}
              onChange={e => setRegEmail(e.target.value)} placeholder="you@email.com" />

            {regError && <p className="text-destructive text-sm">{regError}</p>}

            <Button onClick={handleRegister} disabled={regLoading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold mt-2">
              {regLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Sign Up for Promos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const greeting = profile?.firstName
    ? displayName(profile.firstName, profile.lastName)
    : "Guest";

  return (
    <div className="bg-background min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-xl">

        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <span className="text-primary font-serif text-2xl font-bold">
                {greeting.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-serif text-2xl text-foreground">
                {profile ? `Welcome back, ${profile.firstName}!` : "My Account"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {profile
                  ? "Your details auto-fill at checkout on this device."
                  : "Order once — we'll remember you on this phone or computer."}
              </p>
              {profile?.customerPhone && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {profile.customerPhone}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-serif font-bold text-primary">{orders.length}</p>
              <p className="text-xs text-muted-foreground">order{orders.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>

        <div className="bg-muted/30 border border-border rounded-xl px-4 py-3 mb-6 text-sm text-muted-foreground">
          For your privacy, we don't look up accounts by phone number. Order history shows orders placed on this device.
        </div>

        {orders.length > 0 && (
          <div className="bg-secondary/10 border border-secondary/30 rounded-xl px-4 py-3 flex items-center gap-3 mb-6">
            <CheckCircle2 className="h-5 w-5 text-secondary shrink-0" />
            <p className="text-sm text-foreground">
              You've ordered <span className="font-bold text-secondary">{orders.length} time{orders.length !== 1 ? "s" : ""}</span> from this device. Thank you! 🙏
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-xl text-foreground">Order History</h3>
          <button onClick={() => setStep("register")} className="text-xs text-primary hover:underline">
            Join promo list
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-2xl">
            <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-semibold mb-1">No orders on this device yet</p>
            <p className="text-sm text-muted-foreground mb-5">Place an order and it will appear here automatically.</p>
            <Button asChild className="bg-primary hover:bg-primary/90 text-white">
              <Link href="/menu">Browse Menu</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <OrderCard key={order.id} order={order} onReorder={handleReorder} />
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Button asChild variant="outline" className="flex-1 border-border hover:border-primary hover:text-primary">
            <Link href="/menu"><Package className="mr-2 h-4 w-4" /> Menu</Link>
          </Button>
          <Button asChild className="flex-1 bg-primary hover:bg-primary/90 text-white">
            <Link href="/order"><ShoppingBag className="mr-2 h-4 w-4" /> Order Now</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
