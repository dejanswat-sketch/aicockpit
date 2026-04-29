'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { useAuth } from '@/contexts/AuthContext';
import {
  Radio,
  Brain,
  Archive,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  Settings,
  User,
  Bell,
  LogOut,
  X,
  Key,
  Palette,
  Globe,
  Shield,
  Send,
} from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


interface NavItem {
  id: string;
  label: string;
  route: string;
  icon: React.ElementType;
  badge?: number;
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'nav-radar', label: 'RADAR', route: '/radar', icon: Radio, badge: 3, section: 'cockpit' },
  { id: 'nav-ai-brain', label: 'AI BRAIN', route: '/ai-brain', icon: Brain, section: 'cockpit' },
  { id: 'nav-vault', label: 'VAULT', route: '/vault', icon: Archive, section: 'cockpit' },
  { id: 'nav-submissions', label: 'SUBMISSIONS', route: '/submissions', icon: Send, section: 'cockpit' },
  { id: 'nav-laboratorija', label: 'LABORATORIJA', route: '/laboratorija', icon: FlaskConical, section: 'cockpit' },
];

interface SidebarProps {
  activeRoute: string;
}

export default function Sidebar({ activeRoute }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/login');
      router.refresh();
    } catch {}
  };

  const userEmail = user?.email ?? '';
  const displayName = user?.user_metadata?.full_name || userEmail.split('@')[0] || 'User';

  return (
    <>
      <aside
        className={`
          flex flex-col h-full bg-zinc-900 border-r border-zinc-800
          transition-all duration-300 ease-in-out flex-shrink-0
          ${collapsed ? 'w-16' : 'w-56'}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center border-b border-zinc-800 h-16 px-3 ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
          <AppLogo size={32} />
          {!collapsed && (
            <span className="font-sans font-700 text-base tracking-tight text-zinc-100 whitespace-nowrap overflow-hidden">
              AICockpit
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {!collapsed && (
            <p className="text-[10px] font-mono font-500 text-zinc-600 uppercase tracking-widest px-2 mb-3">
              Cockpit
            </p>
          )}
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeRoute === item.route;
            return (
              <Link
                key={item.id}
                href={item.route}
                title={collapsed ? item.label : undefined}
                className={`
                  group flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-150
                  ${isActive
                    ? 'bg-teal-400/10 text-teal-400 border border-teal-400/20' :'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-transparent'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
              >
                <Icon
                  size={18}
                  className={`flex-shrink-0 ${isActive ? 'text-teal-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}
                />
                {!collapsed && (
                  <span className="text-sm font-medium tracking-wide whitespace-nowrap">
                    {item.label}
                  </span>
                )}
                {!collapsed && item.badge && (
                  <span className="ml-auto bg-teal-400/20 text-teal-400 text-[10px] font-mono font-600 px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
                {collapsed && item.badge && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-teal-400 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-zinc-800 p-2 space-y-1">
          <button
            suppressHydrationWarning
            title="Notifications"
            className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
          >
            <Bell size={16} />
            {!collapsed && <span className="text-sm font-medium">Alerts</span>}
          </button>
          <button
            suppressHydrationWarning
            title="Settings"
            onClick={() => setShowSettings(true)}
            className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
          >
            <Settings size={16} />
            {!collapsed && <span className="text-sm font-medium">Settings</span>}
          </button>

          {/* Sign Out */}
          <button
            suppressHydrationWarning
            onClick={handleSignOut}
            title="Sign Out"
            className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={16} />
            {!collapsed && <span className="text-sm font-medium">Sign Out</span>}
          </button>

          {/* User */}
          <div className={`flex items-center gap-2.5 px-2.5 py-2.5 mt-1 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center flex-shrink-0">
              <User size={14} className="text-zinc-900" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-xs font-medium text-zinc-200 truncate">{displayName}</p>
                <p className="text-[10px] text-zinc-500 truncate">{userEmail}</p>
              </div>
            )}
          </div>

          {/* Collapse toggle */}
          <button
            suppressHydrationWarning
            onClick={() => setCollapsed(!collapsed)}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
          >
            {collapsed ? <ChevronRight size={14} /> : (
              <>
                <ChevronLeft size={14} />
                <span className="text-xs">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Settings Modal — z-50 ensures it renders above all page content */}
      {showSettings && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 9999 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          />
          {/* Panel */}
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Settings size={16} className="text-teal-400" />
                <span className="text-sm font-600 text-zinc-100">Settings</span>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Account */}
              <div>
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Account</p>
                <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-zinc-900" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-zinc-200 truncate">{displayName}</p>
                    <p className="text-xs text-zinc-500 truncate">{userEmail}</p>
                  </div>
                </div>
              </div>

              {/* AI Provider */}
              <div>
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">AI Provider</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                    <div className="flex items-center gap-2">
                      <Key size={14} className="text-teal-400" />
                      <span className="text-xs text-zinc-300">Gemini API</span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-[10px] font-mono rounded-full">
                      Connected
                    </span>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div>
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Preferences</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                    <div className="flex items-center gap-2">
                      <Palette size={14} className="text-zinc-400" />
                      <span className="text-xs text-zinc-300">Theme</span>
                    </div>
                    <span className="text-xs text-zinc-500">Dark</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                    <div className="flex items-center gap-2">
                      <Globe size={14} className="text-zinc-400" />
                      <span className="text-xs text-zinc-300">Language</span>
                    </div>
                    <span className="text-xs text-zinc-500">English</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-zinc-400" />
                      <span className="text-xs text-zinc-300">Session Persistence</span>
                    </div>
                    <span className="px-2 py-0.5 bg-teal-400/10 border border-teal-400/20 text-teal-400 text-[10px] font-mono rounded-full">
                      Enabled
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-teal-400 text-zinc-900 text-xs font-600 rounded-lg hover:bg-teal-300 active:scale-95 transition-all duration-150"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}