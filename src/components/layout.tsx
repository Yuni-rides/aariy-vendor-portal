"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Layers,
  Undo2,
  FileText,
  Users,
  Store,
  KeyRound,
  Menu,
  User,
  LogOut,
  Lock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/Sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/DropdownMenu";
import { useAuthStore } from "@/features/auth/auth.store";
import { canAccess, isLiveSeller, mayOpen, mustChangePassword, sellerRoleOf } from "@/features/auth/seller-access";
import { SellerGate } from "@/components/SellerGate";

type NavItem = {
  label: string;
  icon: LucideIcon;
  href: string;
  ready?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    ready: true,
  },
  { label: "Orders", icon: ShoppingBag, href: "/orders", ready: true },
  { label: "Products", icon: Package, href: "/products", ready: true },
  { label: "Stock", icon: Layers, href: "/stock", ready: true },
  { label: "Returns", icon: Undo2, href: "/returns", ready: true },
  { label: "Statements", icon: FileText, href: "/statements", ready: true },
  { label: "Team", icon: Users, href: "/team", ready: true },
  { label: "Brand profile", icon: Store, href: "/brand-profile", ready: true },
  // { label: "API keys", icon: KeyRound, href: "/api-keys", ready: true },
];

export function Sidebar({
  className,
  onClose,
}: {
  className?: string;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const role = sellerRoleOf(user);

  return (
    <div
      className={cn(
        "flex h-full w-[232px] flex-col gap-1 border-r border-sidebar-border bg-white px-3.5 py-5",
        className,
      )}
    >
      <div className="px-2.5">
        <div className="text-[22px] font-semibold leading-tight">Aariy</div>
        <div className="pb-4 text-xs text-muted-foreground">Seller portal</div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.filter((item) => canAccess(role, item.href)).map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          const content = (
            <div
              className={cn(
                "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm",
                isActive
                  ? "bg-accent font-semibold text-foreground"
                  : "text-sidebar-foreground hover:bg-muted",
                !item.ready &&
                  "cursor-not-allowed opacity-50 hover:bg-transparent",
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              <span className="flex-1 truncate">{item.label}</span>
              {!item.ready && (
                <span className="text-[10px] uppercase tracking-wide">
                  Soon
                </span>
              )}
            </div>
          );

          if (!item.ready) {
            return (
              <div key={item.href} aria-disabled="true">
                {content}
              </div>
            );
          }

          return (
            <Link key={item.href} href={item.href} onClick={onClose}>
              {content}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * The sidebar only shows for live sellers (isLive true in the sign-in response).
 * Waits for the auth store to load from storage so it does not flash in and out.
 */
function useShowSidebar() {
  const user = useAuthStore((state) => state.user);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated && isLiveSeller(user) && !mustChangePassword(user);
}

export function Header({ showSidebar }: { showSidebar: boolean }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => logout();

  const initials =
    `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase() ||
    "S";
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Seller";

  return (
    <header className="sticky top-0 z-10 flex min-h-[61px] items-center justify-between gap-3 border-b bg-white px-4 py-3 sm:px-8">
      {showSidebar ? (
        <>
          <div className="flex items-center gap-3 lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[232px] p-0">
                <Sidebar />
              </SheetContent>
            </Sheet>
            <span className="text-lg font-semibold">Aariy</span>
          </div>
          <div className="hidden flex-1 lg:flex" />
        </>
      ) : (
        <div>
          <div className="text-lg font-semibold leading-tight">Aariy</div>
          <div className="text-xs text-muted-foreground">Seller portal</div>
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex cursor-pointer items-center gap-3 rounded-full"
          >
            <span className="hidden text-[13px] text-muted-foreground sm:inline">
              {displayName}
            </span>
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-accent text-[13px] font-semibold text-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <div className="flex flex-col space-y-1 p-2">
            <p className="text-sm font-medium leading-none">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>

          <DropdownMenuSeparator />

          {mayOpen(user, "/brand-profile") && (
            <>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => router.push("/brand-profile")}
              >
                <User className="mr-2 h-4 w-4" />
                <span>Brand profile</span>
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/change-password")}>
            <Lock className="mr-2 h-4 w-4" />
            <span>Change password</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const showSidebar = useShowSidebar();
  return (
    <div className="flex min-h-screen">
      {showSidebar && (
        <div className="fixed inset-y-0 left-0 z-20 hidden lg:block">
          <Sidebar />
        </div>
      )}
      <div className={cn("flex min-w-0 flex-1 flex-col", showSidebar && "lg:pl-[232px]")}>
        <Header showSidebar={showSidebar} />
        <main className="min-w-0 flex-1 overflow-auto p-4 sm:px-8 sm:py-6">
          <SellerGate>{children}</SellerGate>
        </main>
      </div>
    </div>
  );
}
