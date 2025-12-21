"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn, formatCurrency } from '@/lib/utils'
import { MoreHorizontal, Play, Pause, Settings, Eye, Trash2, TrendingUp, Wallet } from 'lucide-react'

export function AgentCard({ agent, onAction }) {
  const statusColors = {
    active: 'bg-green-500/10 text-green-600 border-green-500/20',
    inactive: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    paused: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  }

  const getPerformanceColor = (performance) => {
    if (performance >= 10) return 'text-green-600'
    if (performance >= 5) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <Card className="group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
            <span className="text-primary font-semibold">{agent.name[0]}</span>
          </div>
          <div>
            <CardTitle className="text-lg">{agent.name}</CardTitle>
            <p className="text-sm text-muted-foreground">ID: {agent.id.slice(0, 8)}...</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge
            variant="outline"
            className={cn("transition-colors", statusColors[agent.is_active ? 'active' : 'inactive'])}
          >
            {agent.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAction?.('view', agent)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction?.(agent.is_active ? 'pause' : 'start', agent)}>
                {agent.is_active ? (
                  <><Pause className="mr-2 h-4 w-4" />Pause Agent</>
                ) : (
                  <><Play className="mr-2 h-4 w-4" />Start Agent</>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction?.('wallet', agent)}>
                <Wallet className="mr-2 h-4 w-4" />
                Manage Funds
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction?.('settings', agent)}>
                <Settings className="mr-2 h-4 w-4" />
                Configure
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onAction?.('delete', agent)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Available Capital</p>
            <p className="font-semibold text-lg">
              {formatCurrency(agent.available_capital || 0)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Loans Issued</p>
            <p className="font-semibold text-lg">{agent.total_loans_issued || 0}</p>
          </div>
        </div>

        {/* Performance Indicator */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Performance</span>
          </div>
          <div className="text-right">
            <p className={cn("font-semibold", getPerformanceColor(agent.performance_score || 0))}>
              {agent.performance_score || 0}%
            </p>
            <p className="text-xs text-muted-foreground">Monthly ROI</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onAction?.('view', agent)}
          >
            View Details
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onAction?.('manage', agent)}
          >
            Manage
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}