"use client"

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Bot,
  TrendingUp,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Activity
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, current: true },
  { name: 'AI Agents', href: '/agents', icon: Bot, current: false, badge: '3' },
  { name: 'Analytics', href: '/analytics', icon: TrendingUp, current: false },
  { name: 'Activity', href: '/activity', icon: Activity, current: false },
  { name: 'Settings', href: '/settings', icon: Settings, current: false },
]

const secondaryNavigation = [
  { name: 'Help Center', href: '/help', icon: HelpCircle },
]

export function Sidebar({ collapsed = false, onToggle }) {
  return (
    <div className={cn(
      "flex flex-col h-full bg-card/50 backdrop-blur-xl border-r border-border/40 transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/40">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="font-semibold text-foreground">Hivee</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Quick Actions */}
      {!collapsed && (
        <div className="p-4 border-b border-border/40">
          <Button className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Agent
          </Button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => (
          <a
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
              item.current
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="ml-3 flex-1">{item.name}</span>
                {item.badge && (
                  <span className="ml-auto bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </a>
        ))}
      </nav>

      {/* Secondary Navigation */}
      <div className="p-4 border-t border-border/40">
        {secondaryNavigation.map((item) => (
          <a
            key={item.name}
            href={item.href}
            className="flex items-center px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors"
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="ml-3">{item.name}</span>}
          </a>
        ))}
      </div>
    </div>
  )
}