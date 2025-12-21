"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = 'primary',
  className
}) {
  const colorVariants = {
    primary: 'border-l-primary text-primary',
    green: 'border-l-green-500 text-green-500',
    purple: 'border-l-purple-500 text-purple-500',
    orange: 'border-l-orange-500 text-orange-500',
    blue: 'border-l-blue-500 text-blue-500',
  }

  const formatValue = (val) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `$${(val / 1000000).toFixed(1)}M`
      } else if (val >= 1000) {
        return `$${(val / 1000).toFixed(1)}K`
      }
      return formatCurrency(val)
    }
    return val
  }

  return (
    <Card className={cn(
      "border-l-4 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5",
      colorVariants[color],
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className={`h-4 w-4 ${colorVariants[color].split(' ')[1]}`} />}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className={`text-3xl font-bold ${colorVariants[color].split(' ')[1]}`}>
          {typeof value === 'number' ? formatValue(value) : value}
        </div>
        <div className="flex items-center justify-between">
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center text-xs font-medium",
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            )}>
              {trend === 'up' ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {trendValue}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}