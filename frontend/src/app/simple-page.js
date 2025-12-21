'use client'

import { MainLayout } from '@/components/layout/main-layout'
import { WalletConnectButton } from '@/components/wallet/wallet-connect-button'

export default function SimplePage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Hivee - Test WalletConnect</h1>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Connexion Wallet</h2>
            <WalletConnectButton />
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Connectez votre wallet MetaMask pour tester l'intégration WalletConnect avec le réseau CapX.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}