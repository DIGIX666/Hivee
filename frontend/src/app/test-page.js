'use client'

import { WalletConnectButton } from '@/components/wallet/wallet-connect-button'
import { WalletStatusCard } from '@/components/wallet/wallet-connect-button'
import { MainLayout } from '@/components/layout/main-layout'

export default function TestPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Test WalletConnect Integration</h1>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <span>Wallet Connection:</span>
            <WalletConnectButton />
          </div>

          <div className="max-w-md">
            <h3 className="text-lg font-semibold mb-4">Wallet Status</h3>
            <WalletStatusCard />
          </div>
        </div>
      </div>
    </MainLayout>
  )
}