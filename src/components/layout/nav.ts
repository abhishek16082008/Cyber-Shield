/* Navigation model shared by the desktop sidebar and the mobile menu. */
import {
  Home,
  ScanSearch,
  Route,
  FileText,
  LayoutDashboard,
  Info,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Requires the user to be logged in. */
  protected: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", to: "/", icon: Home, protected: false },
  { label: "Analyse", to: "/analyse", icon: ScanSearch, protected: true },
  { label: "Investigation", to: "/investigation", icon: Route, protected: true },
  { label: "Reports", to: "/reports", icon: FileText, protected: true },
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, protected: true },
  { label: "About", to: "/about", icon: Info, protected: false },
];
