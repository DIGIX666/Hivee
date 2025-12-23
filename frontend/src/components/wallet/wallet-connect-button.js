'use client'

import { useState } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Wallet,
  ChevronDown,
  Copy,
  ExternalLink,
  LogOut,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

export function WalletConnectButton({ size = "default", variant = "default" }) {
  const {
    account,
    balance,
    connected,
    connecting,
    error,
    connectWallet,
    disconnect,
    isCapxTestnet,
    switchToCapxTestnetNetwork,
    formatBalance
  } = useWallet()

  const [copySuccess, setCopySuccess] = useState(false)

  const handleConnect = async () => {
    await connectWallet()
  }

  const handleDisconnect = () => {
    disconnect()
  }

  const copyAddress = async () => {
    if (account) {
      await navigator.clipboard.writeText(account)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  const truncateAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const openExplorer = () => {
    if (account && isCapxTestnet) {
      window.open(`https://capx-testnet-c1.explorer.caldera.xyz/address/${account}`, '_blank')
    }
  }

  // Connection state
  if (!connected) {
    return (
      <div className="flex flex-col items-center gap-2">
        <Button
          onClick={handleConnect}
          disabled={connecting}
          size={size}
          variant={variant}
          className="flex items-center gap-2 min-w-fit"
        >
          <Wallet className="h-4 w-4" />
          {connecting ? 'Connecting...' : 'Connect Wallet'}
        </Button>

        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    )
  }

  // Connected state
  return (
    <div className="flex flex-col gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={size}
            className="flex items-center gap-2 min-w-fit"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <Wallet className="h-4 w-4" />
              <span className="font-mono">{truncateAddress(account)}</span>
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          <div className="p-2">
            <div className="text-sm font-medium mb-2">Connected Wallet</div>

            {/* Address */}
            <div className="flex items-center justify-between mb-2 p-2 bg-muted rounded">
              <span className="font-mono text-xs">{truncateAddress(account)}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyAddress}
                className="h-6 w-6 p-0"
              >
                {copySuccess ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>

            {/* Balance */}
            <div className="text-sm mb-2">
              <span className="text-muted-foreground">Balance: </span>
              <span className="font-semibold">{formatBalance(balance)} CAPX</span>
            </div>

            {/* Network state */}
            <div className="flex items-center gap-2 mb-3">
              {isCapxTestnet ? (
                <Badge variant="success" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  CapX Testnet
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Wrong Network
                </Badge>
              )}
            </div>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={copyAddress} className="cursor-pointer">
            <Copy className="h-4 w-4 mr-2" />
            Copy address
          </DropdownMenuItem>

          {isCapxTestnet && (
            <DropdownMenuItem onClick={openExplorer} className="cursor-pointer">
              <ExternalLink className="h-4 w-4 mr-2" />
              View in explorer
            </DropdownMenuItem>
          )}

          {!isCapxTestnet && (
            <DropdownMenuItem onClick={switchToCapxTestnetNetwork} className="cursor-pointer">
              <AlertCircle className="h-4 w-4 mr-2" />
              Switch to CapX Testnet
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleDisconnect} className="cursor-pointer text-red-600">
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Network alert */}
      {!isCapxTestnet && (
        <div className="flex items-center gap-2 text-amber-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>Please connect to CapX Testnet network</span>
        </div>
      )}
    </div>
  )
}

export function WalletStatusCard() {
  const {
    account,
    balance,
    connected,
    isCapxTestnet,
    formatBalance
  } = useWallet()

  if (!connected) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center">
            <Wallet className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Wallet not connected</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Wallet</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-600">Connected</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Address</span>
              <span className="text-xs font-mono">
                {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : ''}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Balance</span>
              <span className="text-xs font-semibold">
                {formatBalance(balance)} CAPX
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Network</span>
              <Badge
                variant={isCapxTestnet ? "success" : "destructive"}
                className="text-xs"
              >
                {isCapxTestnet ? "CapX Testnet" : "Incorrect"}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}