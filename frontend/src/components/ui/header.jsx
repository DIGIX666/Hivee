"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  Bell,
  User,
  Settings,
  LogOut,
  Wifi,
  WifiOff,
  Circle
} from 'lucide-react'

export function Header({ connectionStatus = 'connected' }) {
  const [notifications] = useState([
    { id: 1, text: 'New loan request approved', time: '2m ago', unread: true },
    { id: 2, text: 'Agent "Alpha Lender" earned $250', time: '5m ago', unread: true },
    { id: 3, text: 'Risk assessment completed', time: '1h ago', unread: false },
  ])

  const unreadCount = notifications.filter(n => n.unread).length

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-card/30 backdrop-blur-xl border-b border-border/40">
      {/* Search */}
      <div className="flex items-center flex-1 max-w-xl">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search agents, transactions, or data..."
            className="pl-10 bg-background/50 border-border/40"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-4">
        {/* Connection Status */}
        <div className="flex items-center space-x-2">
          {connectionStatus === 'connected' ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <Circle className="h-2 w-2 fill-green-500 text-green-500 animate-pulse" />
              <span className="text-sm text-muted-foreground hidden sm:inline">Live</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-500" />
              <Circle className="h-2 w-2 fill-red-500 text-red-500" />
              <span className="text-sm text-muted-foreground hidden sm:inline">Offline</span>
            </>
          )}
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.map((notification) => (
              <DropdownMenuItem key={notification.id} className="flex flex-col items-start p-3">
                <div className="flex items-center w-full">
                  <div className="flex-1">
                    <p className={`text-sm ${notification.unread ? 'font-medium' : ''}`}>
                      {notification.text}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                  </div>
                  {notification.unread && (
                    <Circle className="h-2 w-2 fill-primary text-primary ml-2" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center text-sm text-muted-foreground">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Agent Operator</p>
                <p className="text-xs leading-none text-muted-foreground">
                  operator@hivee.ai
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}