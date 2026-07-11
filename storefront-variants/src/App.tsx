import { useState } from "react";
import { demos } from "@/data/demos";
import { PageRenderer } from "@/components/PageRenderer";

export function App() {
  const [activeDemo, setActiveDemo] = useState(() => {
    const param = new URLSearchParams(window.location.search).get("demo");
    if (!param) return 0;
    const byId = demos.findIndex((d) => d.id === param);
    if (byId >= 0) return byId;
    const byIndex = Number(param);
    return Number.isInteger(byIndex) && byIndex >= 0 && byIndex < demos.length ? byIndex : 0;
  });
  const config = demos[activeDemo];

  return (
    <div className="min-h-screen">
      {/* Demo Switcher */}
      <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-full p-2 flex gap-2 items-center text-sm font-sans">
        <span className="px-3 text-zinc-500 font-medium hidden md:inline">Demo Switcher</span>
        {demos.map((demo, idx) => (
          <button
            key={demo.id}
            onClick={() => setActiveDemo(idx)}
            className={`px-4 py-2 rounded-full font-medium transition-colors ${
              activeDemo === idx 
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" 
                : "bg-transparent text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {demo.name}
          </button>
        ))}
      </div>

      {/* Render Tenant */}
      <PageRenderer config={config} />
    </div>
  );
}

export default App;
