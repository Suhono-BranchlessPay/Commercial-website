import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { CartProvider } from "@/lib/cart";
import { TenantProvider } from "@/lib/tenant";
import { Layout } from "@/components/layout";
import Home from "@/pages/home";
import Menu from "@/pages/menu";
import Order from "@/pages/order";
import Catering from "@/pages/catering";
import Owner from "@/pages/owner";
import Account from "@/pages/account";
import TagPage from "@/pages/tag";
import PlacePage from "@/pages/place";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/menu" component={Menu} />
        <Route path="/order" component={Order} />
        <Route path="/catering" component={Catering} />
        <Route path="/owner" component={Owner} />
        <Route path="/account" component={Account} />
        <Route path="/tags/:slug" component={TagPage} />
        <Route path="/places/:slug" component={PlacePage} />
        {/* Multilingual SEO prefixes — same pages, locale in path for crawlers */}
        <Route path="/:locale/tags/:slug" component={TagPage} />
        <Route path="/:locale/places/:slug" component={PlacePage} />
        <Route path="/:locale/menu" component={Menu} />
        <Route path="/:locale/order" component={Order} />
        <Route path="/:locale/catering" component={Catering} />
        <Route path="/:locale" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <CartProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </CartProvider>
      </TenantProvider>
    </QueryClientProvider>
  );
}

export default App;
