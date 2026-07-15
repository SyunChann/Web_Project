import type { ReactNode } from "react";
import "./travel.css";

export default function TravelLayout({ children }: { children: ReactNode }) {
  return <div data-travel-theme>{children}</div>;
}
