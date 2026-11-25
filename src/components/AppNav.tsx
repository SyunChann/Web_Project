type AppNavProps = {
  showAuth?: boolean;
  active?:
    | "home"
    | "reviews"
    | "recommendations"
    | "watchlist"
    | "domestic-restaurants-map"
    | "overseas-restaurants-map"
    | "travel"
    | "restaurant-map"
    | "merchandise"
    | "departures"
    | "exchange-rates"
    | "drinks"
    | "ai-office"
    | "admin";
};

// Navigation is rendered once by SiteShell in the root layout.
// Keep this entry point for existing pages during their independent maintenance.
export function AppNav(_props: AppNavProps) { void _props; return null; }
