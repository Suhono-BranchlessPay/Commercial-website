import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Phone, RefreshCw, ShoppingBag, Clock, CheckCircle2, RotateCcw,
  ChevronDown, ChevronUp, MapPin, Package, Mail, User, Building2,
  UserPlus, ArrowLeft,
} from "lucide-react";
import type { MenuItem } from "@workspace/api-client-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  createdAt: string;
}

interface OrderLine {
  id: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  specialInstructions: string | null;
}

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
  lines: OrderLine[];
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

/* ── Input field component ── */
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

/* ── Order card ── */
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

/* ══════════════════ Main Page ══════════════════ */
type Step = "phone" | "register" | "dashboard";

export default function Account() {
  const { addItem, setIsCartOpen } = useCart();
  const { toast } = useToast();

  /* Step state */
  const [step, setStep]               = useState<Step>("phone");
  const [phone, setPhone]             = useState("");
  const [customer, setCustomer]       = useState<Customer | null>(null);
  const [orders, setOrders]           = useState<PastOrder[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  /* Registration form */
  const [regName,  setRegName]   = useState("");
  const [regEmail, setRegEmail]  = useState("");
  const [regCity,  setRegCity]   = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError,   setRegError]  = useState("");

  /* ── Step 1: Phone lookup ── */
  const handleLookup = async () => {
    const raw = phone.trim();
    if (raw.replace(/\D/g, "").length < 7) { setError("Please enter a valid phone number."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API_BASE}/api/customers?phone=${encodeURIComponent(raw)}`);
      const data = await res.json();
      if (!res.ok) { setError("Something went wrong. Try again."); return; }
      setOrders(data.orders ?? []);
      if (data.customer) {
        setCustomer(data.customer);
        setStep("dashboard");
      } else {
        /* Not registered yet — pre-fill name from order history if available */
        if (data.orders?.[0]?.customerName) setRegName(data.orders[0].customerName);
        setStep("register");
      }
    } catch {
      setError("Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2: Registration ── */
  const handleRegister = async () => {
    if (!regName.trim())  { setRegError("Please enter your name."); return; }
    if (!/\S+@\S+\.\S+/.test(regEmail)) { setRegError("Please enter a valid email."); return; }
    if (!regCity.trim())  { setRegError("Please enter your city."); return; }
    setRegLoading(true); setRegError("");
    try {
      const res  = await fetch(`${API_BASE}/api/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regName.trim(), phone: phone.trim(), email: regEmail.trim(), city: regCity.trim() }),
      });
      const data = await res.json();
      if (res.status === 409) { setCustomer(data.customer); setStep("dashboard"); return; }
      if (!res.ok) { setRegError(data.error ?? "Registration failed."); return; }
      setCustomer(data.customer);
      toast({ title: "Welcome! 🎉", description: "Your account has been created." });
      setStep("dashboard");
    } catch {
      setRegError("Cannot connect to server.");
    } finally {
      setRegLoading(false);
    }
  };

  /* ── Reorder ── */
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

  /* ═══════ RENDER ═══════ */

  /* ── Phone lookup screen ── */
  if (step === "phone") return (
    <div className="bg-background min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-md">
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-serif text-4xl text-foreground mb-2">My Account</h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Enter your phone number to access your account and order history.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <Field
            label="Phone Number"
            icon={Phone}
            type="tel"
            value={phone}
            onChange={e => { setPhone(e.target.value); setError(""); }}
            onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && handleLookup()}
            placeholder="(765) 315-0073"
          />
          {error && <p className="text-destructive text-sm mt-2">{error}</p>}
          <Button
            onClick={handleLookup}
            disabled={loading || phone.trim().replace(/\D/g, "").length < 7}
            className="w-full h-12 mt-4 bg-primary hover:bg-primary/90 text-white font-semibold"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Continue"}
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          First time ordering?{" "}
          <Link href="/menu" className="text-primary hover:underline font-semibold">Browse our menu →</Link>
        </p>
      </div>
    </div>
  );

  /* ── Registration screen ── */
  if (step === "register") return (
    <div className="bg-background min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-md">
        <button onClick={() => setStep("phone")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserPlus className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-serif text-3xl text-foreground mb-2">Create Account</h1>
          <p className="text-muted-foreground text-sm">
            We didn't find an account for <span className="text-foreground font-semibold">{phone}</span>.<br />
            Register to track orders and get exclusive promos!
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <Field label="Full Name" icon={User} type="text" value={regName}
            onChange={e => setRegName(e.target.value)} placeholder="John Doe" />
          <Field label="Phone Number" icon={Phone} type="tel" value={phone}
            readOnly className="opacity-60 cursor-not-allowed" onChange={() => {}} />
          <Field label="Email Address" icon={Mail} type="email" value={regEmail}
            onChange={e => setRegEmail(e.target.value)} placeholder="john@email.com" />
          <Field label="City" icon={Building2} type="text" value={regCity}
            onChange={e => setRegCity(e.target.value)} placeholder="Martinsville" />

          {regError && <p className="text-destructive text-sm">{regError}</p>}

          <Button
            onClick={handleRegister}
            disabled={regLoading}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold mt-2"
          >
            {regLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
            Create Account
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            By registering, you agree to receive order updates and occasional promos.
          </p>
        </div>
      </div>
    </div>
  );

  /* ── Dashboard screen ── */
  return (
    <div className="bg-background min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-xl">

        {/* Profile card */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <span className="text-primary font-serif text-2xl font-bold">
                {customer?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-serif text-2xl text-foreground">{customer?.name}</h2>
              <p className="text-sm text-muted-foreground truncate">{customer?.email}</p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" /> {customer?.phone}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3" /> {customer?.city}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-serif font-bold text-primary">{orders.length}</p>
              <p className="text-xs text-muted-foreground">order{orders.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>

        {/* Loyalty badge */}
        {orders.length > 0 && (
          <div className="bg-secondary/10 border border-secondary/30 rounded-xl px-4 py-3 flex items-center gap-3 mb-6">
            <CheckCircle2 className="h-5 w-5 text-secondary shrink-0" />
            <p className="text-sm text-foreground">
              You've ordered <span className="font-bold text-secondary">{orders.length} time{orders.length !== 1 ? "s" : ""}</span>. Thank you for your loyalty! 🙏
            </p>
          </div>
        )}

        {/* Order history */}
        <h3 className="font-serif text-xl text-foreground mb-4">Order History</h3>

        {orders.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-2xl">
            <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-semibold mb-1">No orders yet</p>
            <p className="text-sm text-muted-foreground mb-5">Your order history will appear here.</p>
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

        {/* Bottom CTA */}
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
