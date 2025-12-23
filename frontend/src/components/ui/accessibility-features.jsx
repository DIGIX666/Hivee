"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Accessibility, Eye, Volume2, Moon, Sun } from 'lucide-react'

export function AccessibilityPanel() {
  const [fontSize, setFontSize] = useState(16)
  const [highContrast, setHighContrast] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [screenReader, setScreenReader] = useState(false)

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`

    if (highContrast) {
      document.documentElement.classList.add('high-contrast')
    } else {
      document.documentElement.classList.remove('high-contrast')
    }

    if (reducedMotion) {
      document.documentElement.classList.add('reduce-motion')
    } else {
      document.documentElement.classList.remove('reduce-motion')
    }
  }, [fontSize, highContrast, reducedMotion])

  return (
    <TooltipProvider>
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg">
          <div className="flex items-center space-x-2 mb-4">
            <Accessibility className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Accessibility</span>
          </div>

          <div className="space-y-3">
            {/* Font Size */}
            <div className="flex items-center justify-between">
              <span className="text-sm">Font Size</span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                  disabled={fontSize <= 12}
                  aria-label="Decrease font size"
                >
                  A-
                </Button>
                <Badge variant="secondary">{fontSize}px</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                  disabled={fontSize >= 24}
                  aria-label="Increase font size"
                >
                  A+
                </Button>
              </div>
            </div>

            {/* High Contrast */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={highContrast ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setHighContrast(!highContrast)}
                  aria-pressed={highContrast}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  High Contrast
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Enhance text visibility</p>
              </TooltipContent>
            </Tooltip>

            {/* Reduced Motion */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={reducedMotion ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setReducedMotion(!reducedMotion)}
                  aria-pressed={reducedMotion}
                >
                  <Moon className="h-4 w-4 mr-2" />
                  Reduce Motion
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Minimize animations</p>
              </TooltipContent>
            </Tooltip>

            {/* Screen Reader Mode */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={screenReader ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setScreenReader(!screenReader)}
                  aria-pressed={screenReader}
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  Screen Reader
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Optimize for assistive technology</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium z-50"
    >
      Skip to main content
    </a>
  )
}

// Screen reader only text
export function ScreenReaderText({ children }) {
  return <span className="sr-only">{children}</span>
}