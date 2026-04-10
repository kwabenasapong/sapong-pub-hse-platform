"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const NAV = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/ministries",
    label: "Ministries",
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    href: "/setup",
    label: "New Client",
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

// Determine initial collapsed state from window width (client-only)
function getInitialCollapsed() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 1024;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-collapse on tablet, expand on desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setCollapsed(false);
        setMobileOpen(false);
      } else if (window.innerWidth >= 640) {
        setCollapsed(true);
        setMobileOpen(false);
      }
      // Below 640: sidebar is hidden, mobile overlay used
    }
    setCollapsed(getInitialCollapsed());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close mobile overlay on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const sidebarContent = (isMobile = false) => (
    <div className={`flex flex-col h-full ${isMobile ? "w-64" : ""}`}>
      {/* Logo */}
      <div className={`flex items-center border-b border-stone-700 flex-shrink-0 ${
        collapsed && !isMobile ? "px-3 py-4 justify-center" : "px-4 py-4 gap-3"
      }`}>
        <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-stone-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        {(!collapsed || isMobile) && (
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-stone-100 leading-tight">Sapong</p>
            <p className="text-[10px] text-stone-400 leading-tight">Publishing House</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className={`flex-1 py-3 space-y-0.5 ${collapsed && !isMobile ? "px-2" : "px-3"}`}>
        {NAV.map(({ href, label, icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed && !isMobile ? label : undefined}
              className={`flex items-center rounded transition-colors ${
                collapsed && !isMobile
                  ? "justify-center p-2.5"
                  : "gap-3 px-3 py-2.5"
              } ${
                active
                  ? "bg-amber-500 text-stone-900"
                  : "text-stone-300 hover:bg-stone-800 hover:text-stone-100"
              }`}
            >
              {icon}
              {(!collapsed || isMobile) && (
                <span className="text-sm font-medium">{label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Toggle button (desktop/tablet) */}
      {!isMobile && (
        <div className="border-t border-stone-700 p-2 flex-shrink-0">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={`w-full flex items-center rounded p-2 text-stone-500 hover:text-stone-300 hover:bg-stone-800 transition-colors ${
              collapsed ? "justify-center" : "gap-2"
            }`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${collapsed ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            {!collapsed && <span className="text-xs">Collapse</span>}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ── Mobile hamburger button (shown below sm) ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="sm:hidden fixed top-3 left-3 z-40 w-9 h-9 bg-stone-800 text-stone-100 rounded-lg flex items-center justify-center shadow-lg"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative w-64 bg-stone-900 text-stone-100 h-full shadow-2xl z-10">
            {sidebarContent(true)}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 text-stone-400 hover:text-stone-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </aside>
        </div>
      )}

      {/* ── Desktop / tablet sidebar ── */}
      <aside className={`hidden sm:flex flex-col bg-stone-900 text-stone-100 h-full flex-shrink-0 transition-all duration-200 ${
        collapsed ? "w-14" : "w-56"
      }`}>
        {sidebarContent()}
      </aside>
    </>
  );
}
