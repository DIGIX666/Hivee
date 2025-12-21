"use client"

import { Cpu } from 'lucide-react'
import { WalletConnectButton } from '@/components/wallet/wallet-connect-button'

export function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header minimaliste */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Cpu className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold gradient-text">Hivee Protocol</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Decentralized AI Agent Credit
              </div>
              <WalletConnectButton size="sm" />
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}