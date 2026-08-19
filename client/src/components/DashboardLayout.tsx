import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useIsMobile } from "@/hooks/useMobile";
import { Bell, Droplets, LayoutDashboard, Leaf, LogOut, MapPinned, PanelLeft } from "lucide-react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const menuItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/" },
  { icon: MapPinned, label: "Fields", path: "/fields" },
  { icon: Droplets, label: "Irrigation", path: "/irrigation" },
  { icon: Bell, label: "Alerts", path: "/alerts" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) return <div className="flex min-h-screen items-center justify-center bg-[#f9f9f8] p-5"><div className="w-full max-w-md rounded-2xl border border-[#dce6dc] bg-white p-8 text-center shadow-[0_10px_32px_rgba(27,67,50,0.08)]"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#012d1d] text-white"><Leaf className="h-6 w-6" /></div><h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#012d1d]">Welcome to AgriNova</h1><p className="mt-3 text-sm leading-6 text-[#607068]">Sign in to monitor crop water stress and manage your irrigation decisions.</p><Button className="mt-6 w-full bg-[#2D6A4F] text-white hover:bg-[#1b4332]" onClick={() => startLogin()}>Sign in to continue</Button></div></div>;
  return <SidebarProvider><AgrinovaShell>{children}</AgrinovaShell></SidebarProvider>;
}

function AgrinovaShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const currentLabel = menuItems.find(item => location === item.path || (item.path === "/fields" && location.startsWith("/fields")))?.label ?? "AgriNova";
  return <><Sidebar collapsible="icon" className="border-r border-[#dce6dc] bg-[#f6f8f5]"><SidebarHeader className="h-20 justify-center px-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#012d1d] text-white"><Leaf className="h-5 w-5" /></div><div className="group-data-[collapsible=icon]:hidden"><p className="text-lg font-bold tracking-[-0.04em] text-[#012d1d]">AgriNova</p><p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#648071]">Intelligent stewardship</p></div></div></SidebarHeader><SidebarContent className="px-2 py-3"><SidebarMenu>{menuItems.map(item => { const active = location === item.path || (item.path === "/fields" && location.startsWith("/fields")); return <SidebarMenuItem key={item.label}><SidebarMenuButton isActive={active} onClick={() => setLocation(item.path)} tooltip={item.label} className="h-11 rounded-xl font-medium data-[active=true]:bg-[#d9f0df] data-[active=true]:text-[#145c39]"><item.icon className="h-4.5 w-4.5" /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>; })}</SidebarMenu></SidebarContent><SidebarFooter className="border-t border-[#dce6dc] p-3"><DropdownMenu><DropdownMenuTrigger asChild><button className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-[#eaf3eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F]"><Avatar className="h-9 w-9 border border-[#cbd9cd]"><AvatarFallback className="bg-[#dceede] text-xs font-bold text-[#1d5f3d]">{user?.name?.slice(0, 1).toUpperCase() || "F"}</AvatarFallback></Avatar><div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-semibold text-[#254334]">{user?.name || "Farmer"}</p><p className="mt-0.5 truncate text-xs text-[#6a7c70]">{user?.email || "AgriNova account"}</p></div></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52"><DropdownMenuItem onClick={logout} className="cursor-pointer text-[#a14332] focus:text-[#a14332]"><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu></SidebarFooter></Sidebar><SidebarInset className="bg-[#f9f9f8]">{isMobile ? <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[#dce6dc] bg-[#f9f9f8]/95 px-4 backdrop-blur"><SidebarTrigger /><div><p className="font-semibold text-[#012d1d]">{currentLabel}</p><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#668071]">AgriNova</p></div></header> : null}<main className="min-h-screen flex-1 p-4 sm:p-6 lg:p-8">{children}</main></SidebarInset></>;
}
