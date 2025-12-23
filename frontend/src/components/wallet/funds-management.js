'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs'
import {
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  History,
  Wallet,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Eye
} from 'lucide-react'

export function FundsManagement({ agentId, agentName = "Agent", compact = false, onBalanceUpdate }) {
  const {
    account,
    connected,
    isCapxTestnet,
    formatBalance,
    initiateWalletConnection,
    confirmWalletConnection,
    depositFunds,
    withdrawFunds,
    getAgentWalletInfo,
    getTransactionHistory,
    getAgentFundsBalance,
    sendTransaction
  } = useWallet()

  const [walletInfo, setWalletInfo] = useState(null)
  const [balanceInfo, setBalanceInfo] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [depositLoading, setDepositLoading] = useState(false)
  const [withdrawLoading, setWithdrawLoading] = useState(false)

  // Forms state
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawAddress, setWithdrawAddress] = useState('')

  // Dialogs state
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)

  // Connection state
  const [connectionSession, setConnectionSession] = useState(null)
  const [isConnectingWallet, setIsConnectingWallet] = useState(false)

  useEffect(() => {
    if (connected && agentId) {
      loadData()
    }
  }, [connected, agentId])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadWalletInfo(),
        loadBalanceInfo(),
        loadTransactionHistory()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
    }
    setLoading(false)
  }

  const loadWalletInfo = async () => {
    try {
      const info = await getAgentWalletInfo(agentId)
      setWalletInfo(info)
    } catch (error) {
      console.error('Wallet info error:', error)
      setWalletInfo(null)
    }
  }

  const loadBalanceInfo = async () => {
    try {
      const info = await getAgentFundsBalance(agentId)
      setBalanceInfo(info)

      // Notify parent of new balance
      if (onBalanceUpdate && info) {
        // Try different possible fields
        let balance = 0
        if (info.balance !== undefined) {
          balance = parseFloat(info.balance)
        } else if (info.total_balance !== undefined) {
          balance = parseFloat(info.total_balance)
        } else if (info.available_balance !== undefined) {
          balance = parseFloat(info.available_balance)
        } else if (typeof info === 'number') {
          balance = info
        }

        onBalanceUpdate(balance)
      }
    } catch (error) {
      console.error('Balance info error:', error)
      setBalanceInfo(null)
    }
  }

  const loadTransactionHistory = async () => {
    try {
      const history = await getTransactionHistory(agentId)
      setTransactions(history.transactions || [])
    } catch (error) {
      console.error('History error:', error)
      setTransactions([])
    }
  }

  const handleConnectWalletToAgent = async () => {
    if (!connected || !isCapxTestnet) {
      return
    }

    setIsConnectingWallet(true)
    try {
      // Initiate connection
      const session = await initiateWalletConnection(agentId)
      setConnectionSession(session)

      // Automatically confirm with connected address
      await confirmWalletConnection(session.session_id, account)

      // Reload data
      await loadData()
      setConnectionSession(null)
    } catch (error) {
      console.error('Wallet agent connection error:', error)
    }
    setIsConnectingWallet(false)
  }

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return

    setDepositLoading(true)
    try {
      // First send on-chain transaction (simulation)
      // In a real case, we would send to the agent's address
      const tx = await sendTransaction(
        '0x1234567890abcdef1234567890abcdef12345678', // Simulated agent address
        depositAmount
      )

      // Then register the deposit in the API
      await depositFunds(agentId, depositAmount, tx.hash)

      // Reload data
      await loadData()

      setDepositAmount('')
      setIsDepositModalOpen(false)
    } catch (error) {
      console.error('Deposit error:', error)
    }
    setDepositLoading(false)
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return

    setWithdrawLoading(true)
    try {
      await withdrawFunds(agentId, withdrawAmount, withdrawAddress || account)

      // Reload data
      await loadData()

      setWithdrawAmount('')
      setWithdrawAddress('')
      setIsWithdrawModalOpen(false)
    } catch (error) {
      console.error('Withdrawal error:', error)
    }
    setWithdrawLoading(false)
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="success">Confirmed</Badge>
      case 'pending':
        return <Badge variant="warning">Pending</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (!connected) {
    if (compact) {
      return (
        <div className="text-center p-3">
          <Button variant="outline" size="sm" disabled className="w-full">
            <Wallet className="h-4 w-4 mr-2" />
            Connect Wallet
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Connect your wallet to manage funds
          </p>
        </div>
      )
    }
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Wallet className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Wallet not connected</h3>
            <p className="text-sm text-muted-foreground">
              Connect your wallet to manage this agent's funds
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isCapxTestnet) {
    if (compact) {
      return (
        <div className="text-center p-3">
          <Button variant="outline" size="sm" disabled className="w-full">
            <AlertCircle className="h-4 w-4 mr-2" />
            Wrong Network
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Switch to CapX Testnet
          </p>
        </div>
      )
    }
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-amber-500" />
            <h3 className="font-semibold mb-2">Incorrect Network</h3>
            <p className="text-sm text-muted-foreground">
              Please connect to CapX Testnet network to continue
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <div className="space-y-3">
        {!walletInfo ? (
          <div className="text-center space-y-2">
            <Button
              onClick={handleConnectWalletToAgent}
              disabled={isConnectingWallet}
              size="sm"
              className="w-full"
            >
              <Wallet className="h-4 w-4 mr-2" />
              {isConnectingWallet ? 'Connecting...' : 'Connect to Agent'}
            </Button>
          </div>
        ) : (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <DollarSign className="h-4 w-4 mr-2" />
                Manage Funds
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Funds Management - {agentName}
                </DialogTitle>
              </DialogHeader>
              {/* Version complète dans la modal */}
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                {balanceInfo && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm font-bold truncate">{formatBalance(balanceInfo.available_capital)}</div>
                      <div className="text-xs text-muted-foreground">Avail. Capital</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm font-bold truncate">{formatBalance(balanceInfo.total_earnings)}</div>
                      <div className="text-xs text-muted-foreground">Earnings</div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Dialog open={isDepositModalOpen} onOpenChange={setIsDepositModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center justify-center gap-2">
                        <ArrowUpCircle className="h-4 w-4" />
                        Deposit Funds
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Deposit Funds</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="deposit-amount">Amount (CAPX)</Label>
                          <Input
                            id="deposit-amount"
                            type="number"
                            placeholder="0.0"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            min="0"
                            step="0.001"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={() => setIsDepositModalOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleDeposit} disabled={depositLoading || !depositAmount}>
                            {depositLoading ? 'Processing...' : 'Deposit'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isWithdrawModalOpen} onOpenChange={setIsWithdrawModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex items-center justify-center gap-2">
                        <ArrowDownCircle className="h-4 w-4" />
                        Withdraw Funds
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Withdraw Funds</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="withdraw-amount">Amount (CAPX)</Label>
                          <Input
                            id="withdraw-amount"
                            type="number"
                            placeholder="0.0"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            min="0"
                            step="0.001"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={() => setIsWithdrawModalOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleWithdraw} disabled={withdrawLoading || !withdrawAmount}>
                            {withdrawLoading ? 'Processing...' : 'Withdraw'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Funds management header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Funds Management - {agentName}
          </CardTitle>
          <CardDescription>
            Deposit or withdraw funds to power your autonomous lending agent
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Balance information */}
      {balanceInfo && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg sm:text-xl font-bold truncate">{formatBalance(balanceInfo.wallet_balance)}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Wallet Balance</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg sm:text-xl font-bold truncate">{formatBalance(balanceInfo.available_capital)}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Available Capital</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg sm:text-xl font-bold truncate">{formatBalance(balanceInfo.total_amount_lent)}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Total Lent</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg sm:text-xl font-bold truncate">{formatBalance(balanceInfo.total_earnings)}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Total Earnings</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main actions */}
      <Card>
        <CardContent className="p-6">
          {!walletInfo ? (
            // No wallet connected to agent yet
            <div className="text-center space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Connect wallet to agent</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your wallet to this agent to start managing funds
                </p>
              </div>
              <Button
                onClick={handleConnectWalletToAgent}
                disabled={isConnectingWallet}
                className="flex items-center gap-2"
              >
                <Wallet className="h-4 w-4" />
                {isConnectingWallet ? 'Connecting...' : 'Connect to Agent'}
              </Button>
            </div>
          ) : (
            // Wallet connected, actions available
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Dialog open={isDepositModalOpen} onOpenChange={setIsDepositModalOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center justify-center gap-2 w-full sm:w-auto">
                    <ArrowUpCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Deposit Funds</span>
                    <span className="sm:hidden">Deposit</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Deposit Funds</DialogTitle>
                    <DialogDescription>
                      Add funds to your agent to increase its lending capital
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="deposit-amount">Amount (CAPX)</Label>
                      <Input
                        id="deposit-amount"
                        type="number"
                        placeholder="0.0"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        min="0"
                        step="0.001"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setIsDepositModalOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleDeposit}
                        disabled={depositLoading || !depositAmount}
                      >
                        {depositLoading ? 'Processing...' : 'Deposit'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isWithdrawModalOpen} onOpenChange={setIsWithdrawModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center justify-center gap-2 w-full sm:w-auto">
                    <ArrowDownCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Withdraw Funds</span>
                    <span className="sm:hidden">Withdraw</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Withdraw Funds</DialogTitle>
                    <DialogDescription>
                      Withdraw funds from your agent to your wallet
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="withdraw-amount">Amount (CAPX)</Label>
                      <Input
                        id="withdraw-amount"
                        type="number"
                        placeholder="0.0"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        min="0"
                        step="0.001"
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        Available capital: {formatBalance(balanceInfo?.available_capital || 0)} CAPX
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="withdraw-address">Destination address (optional)</Label>
                      <Input
                        id="withdraw-address"
                        type="text"
                        placeholder={account}
                        value={withdrawAddress}
                        onChange={(e) => setWithdrawAddress(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setIsWithdrawModalOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleWithdraw}
                        disabled={withdrawLoading || !withdrawAmount}
                      >
                        {withdrawLoading ? 'Processing...' : 'Withdraw'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                onClick={loadData}
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">↻</span>
              </Button>

              <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center justify-center gap-2 w-full sm:w-auto">
                    <History className="h-4 w-4" />
                    <span className="hidden sm:inline">History</span>
                    <span className="sm:hidden">Hist.</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Transaction History</DialogTitle>
                    <DialogDescription>
                      All deposit and withdrawal transactions for this agent
                    </DialogDescription>
                  </DialogHeader>
                  <div className="max-h-96 overflow-y-auto">
                    {transactions.length === 0 ? (
                      <div className="text-center py-8">
                        <History className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">No transactions found</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {transactions.map((tx) => (
                          <Card key={tx.id}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {tx.transaction_type === 'deposit' ? (
                                    <ArrowUpCircle className="h-5 w-5 text-green-500" />
                                  ) : (
                                    <ArrowDownCircle className="h-5 w-5 text-blue-500" />
                                  )}
                                  <div>
                                    <div className="font-semibold">
                                      {tx.transaction_type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {new Date(tx.created_at).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold">
                                    {formatBalance(tx.amount)} CAPX
                                  </div>
                                  {getStatusBadge(tx.status)}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}