import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Alerts from "@/pages/Alerts";
import FieldDetail from "@/pages/FieldDetail";
import Fields from "@/pages/Fields";
import Home from "@/pages/Home";
import Irrigation from "@/pages/Irrigation";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function AppRoutes() {
  return <DashboardLayout><Switch><Route path="/" component={Home} /><Route path="/fields" component={Fields} /><Route path="/fields/:id" component={FieldDetail} /><Route path="/irrigation" component={Irrigation} /><Route path="/alerts" component={Alerts} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch></DashboardLayout>;
}

export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><AppRoutes /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
