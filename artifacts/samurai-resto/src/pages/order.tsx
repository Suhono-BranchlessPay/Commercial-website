import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateOrder } from "@workspace/api-client-react";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, CheckCircle2, ShoppingBag, Loader2, Pencil, MapPin, Phone, User, Package } from "lucide-react";
import { Separator } from "@/components/ui/separator";

/* ── Schema ── */
const detailsSchema = z.object({
  customerName:         z.string().min(2, "Name must be at least 2 characters"),
  customerPhone:        z.string().min(10, "Valid phone number required"),
  customerEmail:        z.string().email("Valid email required").optional().or(z.literal("")),
  orderType:            z.enum(["pickup", "delivery"]),
  deliveryAddress:      z.string().optional(),
  specialInstructions:  z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.orderType === "delivery" && (!data.deliveryAddress || data.deliveryAddress.length < 5)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Delivery address required", path: ["deliveryAddress"] });
  }
});

type DetailsValues = z.infer<typeof detailsSchema>;

/* ── Progress Bar ── */
const STEPS = ["Cart", "Details", "Confirm", "Done"] as const;

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10 w-full max-w-lg mx-auto">
      {STEPS.map((label, idx) => {
        const isCompleted = idx < step;
        const isActive    = idx === step;
        const isLast      = idx === STEPS.length - 1;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300
                ${isCompleted ? "bg-primary border-primary text-white" :
                  isActive    ? "bg-primary/20 border-primary text-primary" :
                                "bg-muted border-border text-muted-foreground"}`}
              >
                {isCompleted ? "✓" : idx + 1}
              </div>
              <span className={`text-xs font-semibold whitespace-nowrap ${isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
            {!isLast && (
              <div className={`h-0.5 flex-1 mx-2 mb-5 rounded transition-all duration-500 ${isCompleted ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ══ Main Component ══ */
export default function Order() {
  useEffect(() => { document.title = "Order Online · Samurai Hibachi & Sushi"; }, []);
  const { items, cartTotal, clearCart, setIsCartOpen } = useCart();
  const { toast } = useToast();
  const createOrder = useCreateOrder();

  const [step, setStep]                   = useState(0); // 0=Cart 1=Details 2=Confirm 3=Done
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  const form = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      customerName: "", customerPhone: "", customerEmail: "",
      orderType: "pickup", deliveryAddress: "", specialInstructions: "",
    },
  });

  const values    = form.getValues();
  const orderType = form.watch("orderType");
  const tax       = cartTotal * 0.07;
  const total     = cartTotal + tax;

  /* ── Step 0 → 1: validate cart is non-empty ── */
  const goToDetails = () => {
    if (items.length === 0) {
      toast({ title: "Cart is empty", description: "Add items before proceeding.", variant: "destructive" });
      return;
    }
    setStep(1);
    window.scrollTo(0, 0);
  };

  /* ── Step 1 → 2: validate details form ── */
  const goToConfirm = async () => {
    const ok = await form.trigger();
    if (!ok) return;
    setStep(2);
    window.scrollTo(0, 0);
  };

  /* ── Step 2 → submit ── */
  const placeOrder = () => {
    const data = form.getValues();
    const orderInput = {
      ...data,
      items: items.map(item => ({
        menuItemId: item.menuItem.id,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions || null,
      })),
    };
    createOrder.mutate({ data: orderInput }, {
      onSuccess: (response) => {
        setSuccessOrderId(response.id);
        clearCart();
        setStep(3);
        window.scrollTo(0, 0);
      },
      onError: () => {
        toast({ title: "Order Failed", description: "Please try again.", variant: "destructive" });
      },
    });
  };

  /* ══ Done Screen ══ */
  if (step === 3 && successOrderId) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16">
        <ProgressBar step={3} />
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-10 flex flex-col items-center text-center shadow-xl">
          <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground mb-2">Order Confirmed!</h1>
          <p className="text-muted-foreground mb-6">Thank you for choosing Samurai Hibachi &amp; Sushi.</p>
          <div className="bg-muted w-full rounded-xl p-5 border border-border mb-3">
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">Order Number</p>
            <p className="font-mono text-2xl font-bold text-primary">{successOrderId.substring(0, 8).toUpperCase()}</p>
          </div>
          <div className="bg-muted w-full rounded-xl p-4 border border-border mb-8 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Package className="h-4 w-4 text-primary" />
              <span className="font-semibold capitalize">{values.orderType}</span>
              <span className="text-muted-foreground">— Est. 20–30 min</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{values.customerPhone}</span>
            </div>
            {values.orderType === "delivery" && values.deliveryAddress && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{values.deliveryAddress}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-6">We'll call you at {values.customerPhone} when your order is ready.</p>
          <Button asChild className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-white">
            <Link href="/">← Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-2xl">

        {/* Back link */}
        <Button variant="ghost" asChild className="pl-0 text-muted-foreground hover:text-foreground mb-6">
          <Link href="/menu"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Menu</Link>
        </Button>

        <h1 className="font-serif text-4xl text-foreground mb-8">Checkout</h1>

        <ProgressBar step={step} />

        {/* ══ STEP 0 — Cart Review ══ */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <h2 className="font-serif text-xl text-foreground">Your Cart</h2>
                <span className="ml-auto text-sm text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""}</span>
              </div>

              {items.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-muted-foreground mb-4">Your cart is empty.</p>
                  <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
                    <Link href="/menu">Browse Menu</Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {items.map(item => (
                    <div key={item.menuItem.id} className="flex items-start gap-4 px-6 py-4">
                      <span className="bg-primary/10 text-primary text-sm font-bold px-2.5 py-1 rounded-lg min-w-[2.5rem] text-center">
                        {item.quantity}×
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{item.menuItem.name}</p>
                        {item.specialInstructions && (
                          <p className="text-xs text-muted-foreground italic mt-0.5">Note: {item.specialInstructions}</p>
                        )}
                      </div>
                      <span className="font-semibold text-foreground whitespace-nowrap">
                        ${(item.menuItem.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {items.length > 0 && (
                <div className="px-6 py-4 border-t border-border bg-muted/20 space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span><span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Tax (7%)</span><span>${tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-serif text-xl font-bold text-foreground pt-1">
                    <span>Total</span><span className="text-primary">${total.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setIsCartOpen(true)} className="flex-1 border-border text-foreground hover:border-primary hover:text-primary">
                  <Pencil className="h-4 w-4 mr-2" /> Edit Cart
                </Button>
                <Button onClick={goToDetails} className="flex-1 bg-primary hover:bg-primary/90 text-white h-12">
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ══ STEP 1 — Details ══ */}
        {step === 1 && (
          <Form {...form}>
            <div className="space-y-5">
              {/* Pickup or Delivery */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-serif text-xl text-foreground mb-4">How do you want it?</h2>
                <FormField
                  control={form.control}
                  name="orderType"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4">
                          {(["pickup", "delivery"] as const).map(type => (
                            <FormItem key={type} className="flex items-center space-x-0 space-y-0">
                              <FormControl><RadioGroupItem value={type} className="peer sr-only" /></FormControl>
                              <FormLabel className="flex flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-border bg-popover p-5 hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all">
                                <span className="text-2xl mb-1">{type === "pickup" ? "🥡" : "🛵"}</span>
                                <span className="font-semibold text-base text-foreground capitalize">{type}</span>
                                <span className="text-xs text-muted-foreground mt-0.5">{type === "pickup" ? "Collect at restaurant" : "Delivered to you"}</span>
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Contact Info */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h2 className="font-serif text-xl text-foreground mb-2">Your Info</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="customerName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground flex items-center gap-2"><User className="h-3.5 w-3.5" /> Full Name *</FormLabel>
                      <FormControl><Input placeholder="John Doe" {...field} className="h-12 bg-background" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="customerPhone" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> Phone *</FormLabel>
                      <FormControl><Input placeholder="(765) 555-1234" {...field} className="h-12 bg-background" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="customerEmail" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Email (Optional)</FormLabel>
                    <FormControl><Input placeholder="you@example.com" type="email" {...field} className="h-12 bg-background" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {orderType === "delivery" && (
                  <FormField control={form.control} name="deliveryAddress" render={({ field }) => (
                    <FormItem className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <FormLabel className="text-foreground flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Delivery Address *</FormLabel>
                      <FormControl>
                        <Textarea placeholder="123 Main St, Martinsville, IN 46151" {...field} className="resize-none h-20 bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                <FormField control={form.control} name="specialInstructions" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Order Notes (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="Any special requests for the kitchen?" {...field} className="resize-none h-20 bg-background" /></FormControl>
                  </FormItem>
                )} />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(0)} className="flex-1 border-border">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={goToConfirm} className="flex-1 bg-primary hover:bg-primary/90 text-white h-12">
                  Review Order <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </Form>
        )}

        {/* ══ STEP 2 — Confirm ══ */}
        {step === 2 && (
          <div className="space-y-5">
            {/* Order summary */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <h2 className="font-serif text-xl text-foreground">Order Summary</h2>
                <button onClick={() => setStep(0)} className="text-xs text-primary hover:underline underline-offset-2">Edit Cart</button>
              </div>
              <div className="divide-y divide-border">
                {items.map(item => (
                  <div key={item.menuItem.id} className="flex gap-4 px-6 py-3 items-center">
                    <span className="bg-primary/10 text-primary text-sm font-bold px-2 py-0.5 rounded">{item.quantity}×</span>
                    <span className="flex-1 text-foreground font-medium">{item.menuItem.name}</span>
                    <span className="text-foreground font-semibold">${(item.menuItem.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 border-t border-border bg-muted/20 space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal</span><span>${cartTotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm text-muted-foreground"><span>Tax (7%)</span><span>${tax.toFixed(2)}</span></div>
                <Separator />
                <div className="flex justify-between font-serif text-2xl font-bold text-foreground pt-1">
                  <span>Total</span><span className="text-primary">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Customer details review */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl text-foreground">Your Details</h2>
                <button onClick={() => setStep(1)} className="text-xs text-primary hover:underline underline-offset-2">Edit</button>
              </div>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-3 text-foreground">
                  <span className="text-2xl">{values.orderType === "pickup" ? "🥡" : "🛵"}</span>
                  <span className="font-semibold capitalize">{values.orderType}</span>
                  {values.orderType === "pickup" && <span className="text-muted-foreground">· 789 E Morgan St, Martinsville</span>}
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <User className="h-4 w-4" /><span>{values.customerName}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Phone className="h-4 w-4" /><span>{values.customerPhone}</span>
                </div>
                {values.deliveryAddress && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <MapPin className="h-4 w-4" /><span>{values.deliveryAddress}</span>
                  </div>
                )}
                {values.specialInstructions && (
                  <div className="flex items-start gap-3 text-muted-foreground">
                    <span className="text-base mt-0.5">📝</span><span className="italic">{values.specialInstructions}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-border">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                onClick={placeOrder}
                disabled={createOrder.isPending}
                className="flex-2 flex-[2] bg-primary hover:bg-primary/90 text-white h-14 text-base shadow-lg shadow-primary/20"
              >
                {createOrder.isPending
                  ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Placing Order…</>
                  : <>✓ Place Order · ${total.toFixed(2)}</>}
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              By placing your order, you agree to be contacted at the phone number provided.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
