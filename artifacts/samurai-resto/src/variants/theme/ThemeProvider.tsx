import React from "react";
import { ThemeConfig } from "@/variants/types/config";

export function ThemeProvider({ theme, children }: { theme: ThemeConfig; children: React.ReactNode }) {
  const style = `
    :root {
      --background: ${theme.colors.background};
      --foreground: ${theme.colors.foreground};
      --card: ${theme.colors.card};
      --card-foreground: ${theme.colors.cardForeground};
      --popover: ${theme.colors.card};
      --popover-foreground: ${theme.colors.cardForeground};
      --primary: ${theme.colors.primary};
      --primary-foreground: 0 0% 100%;
      --secondary: ${theme.colors.muted};
      --secondary-foreground: ${theme.colors.foreground};
      --muted: ${theme.colors.muted};
      --muted-foreground: ${theme.colors.mutedForeground};
      --accent: ${theme.colors.accent};
      --accent-foreground: 0 0% 100%;
      --destructive: 0 84.2% 60.2%;
      --destructive-foreground: 0 0% 100%;
      --border: ${theme.colors.border};
      --input: ${theme.colors.border};
      --ring: ${theme.colors.primary};
      --radius: 0.5rem;
      
      --app-font-sans: ${theme.fonts.sans};
      --app-font-serif: ${theme.fonts.serif};
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: style }} />
      <div className="font-sans antialiased text-foreground bg-background min-h-screen">
        {children}
      </div>
    </>
  );
}
