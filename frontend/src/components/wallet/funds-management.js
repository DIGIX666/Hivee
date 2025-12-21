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

export function FundsManagement({ agentId, agentName = "Agent", compact = false }) {
  const {
    account,
    connected,
    isChilizSpicyNetwork,
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
      console.error('Erreur lors du chargement des données:', error)
    }
    setLoading(false)
  }

  const loadWalletInfo = async () => {
    try {
      const info = await getAgentWalletInfo(agentId)
      setWalletInfo(info)
    } catch (error) {
      console.error('Erreur wallet info:', error)
      setWalletInfo(null)
    }
  }

  const loadBalanceInfo = async () => {
    try {
      const info = await getAgentFundsBalance(agentId)
      setBalanceInfo(info)
    } catch (error) {
      console.error('Erreur balance info:', error)
      setBalanceInfo(null)
    }
  }

  const loadTransactionHistory = async () => {
    try {
      const history = await getTransactionHistory(agentId)
      setTransactions(history.transactions || [])
    } catch (error) {
      console.error('Erreur historique:', error)
      setTransactions([])
    }
  }

  const handleConnectWalletToAgent = async () => {
    if (!connected || !isChilizSpicyNetwork) {
      return
    }

    setIsConnectingWallet(true)
    try {
      // Initier la connexion
      const session = await initiateWalletConnection(agentId)
      setConnectionSession(session)

      // Confirmer automatiquement avec l'adresse connectée
      await confirmWalletConnection(session.session_id, account)

      // Recharger les données
      await loadData()
      setConnectionSession(null)
    } catch (error) {
      console.error('Erreur connexion wallet agent:', error)
    }
    setIsConnectingWallet(false)
  }

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return

    setDepositLoading(true)
    try {
      // D'abord envoyer la transaction on-chain (simulation)
      // Dans un vrai cas, on enverrait vers l'adresse de l'agent
      const tx = await sendTransaction(
        '0x1234567890abcdef1234567890abcdef12345678', // Adresse agent simulée
        depositAmount
      )

      // Ensuite enregistrer le dépôt dans l'API
      await depositFunds(agentId, depositAmount, tx.hash)

      // Recharger les données
      await loadData()

      setDepositAmount('')
      setIsDepositModalOpen(false)
    } catch (error) {
      console.error('Erreur dépôt:', error)
    }
    setDepositLoading(false)
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return

    setWithdrawLoading(true)
    try {
      await withdrawFunds(agentId, withdrawAmount, withdrawAddress || account)

      // Recharger les données
      await loadData()

      setWithdrawAmount('')
      setWithdrawAddress('')
      setIsWithdrawModalOpen(false)
    } catch (error) {
      console.error('Erreur retrait:', error)
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
        return <Badge variant="success">Confirmé</Badge>
      case 'pending':
        return <Badge variant="warning">En attente</Badge>
      case 'failed':
        return <Badge variant="destructive">Échoué</Badge>
      default:
        return <Badge variant="outline">Inconnu</Badge>
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
            Connectez votre wallet pour gérer les fonds
          </p>
        </div>
      )
    }
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Wallet className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Wallet non connecté</h3>
            <p className="text-sm text-muted-foreground">
              Connectez votre wallet pour gérer les fonds de cet agent
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isChilizSpicyNetwork) {
    if (compact) {
      return (
        <div className="text-center p-3">
          <Button variant="outline" size="sm" disabled className="w-full">
            <AlertCircle className="h-4 w-4 mr-2" />
            Wrong Network
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Changez vers Chiliz Spicy
          </p>
        </div>
      )
    }
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-amber-500" />
            <h3 className="font-semibold mb-2">Réseau incorrect</h3>
            <p className="text-sm text-muted-foreground">
              Veuillez vous connecter au réseau Chiliz Spicy pour continuer
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
              {isConnectingWallet ? 'Connexion...' : 'Connect to Agent'}
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
                      <div className="text-xs text-muted-foreground">Capital Dispo.</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm font-bold truncate">{formatBalance(balanceInfo.total_earnings)}</div>
                      <div className="text-xs text-muted-foreground">Gains</div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Dialog open={isDepositModalOpen} onOpenChange={setIsDepositModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center justify-center gap-2">
                        <ArrowUpCircle className="h-4 w-4" />
                        Déposer des fonds
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Déposer des fonds</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="deposit-amount">Montant (CHZ)</Label>
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
                            Annuler
                          </Button>
                          <Button onClick={handleDeposit} disabled={depositLoading || !depositAmount}>
                            {depositLoading ? 'En cours...' : 'Déposer'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isWithdrawModalOpen} onOpenChange={setIsWithdrawModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex items-center justify-center gap-2">
                        <ArrowDownCircle className="h-4 w-4" />
                        Retirer des fonds
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Retirer des fonds</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="withdraw-amount">Montant (CHZ)</Label>
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
                            Annuler
                          </Button>
                          <Button onClick={handleWithdraw} disabled={withdrawLoading || !withdrawAmount}>
                            {withdrawLoading ? 'En cours...' : 'Retirer'}
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
      {/* En-tête de gestion des fonds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Gestion des fonds - {agentName}
          </CardTitle>
          <CardDescription>
            Déposez ou retirez des fonds pour alimenter votre agent de prêt autonome
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Informations sur le solde */}
      {balanceInfo && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg sm:text-xl font-bold truncate">{formatBalance(balanceInfo.wallet_balance)}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Balance Wallet</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg sm:text-xl font-bold truncate">{formatBalance(balanceInfo.available_capital)}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Capital Disponible</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg sm:text-xl font-bold truncate">{formatBalance(balanceInfo.total_amount_lent)}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Total Prêté</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg sm:text-xl font-bold truncate">{formatBalance(balanceInfo.total_earnings)}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Gains Totaux</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions principales */}
      <Card>
        <CardContent className="p-6">
          {!walletInfo ? (
            // Pas encore de wallet connecté à l'agent
            <div className="text-center space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Connecter le wallet à l'agent</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Connectez votre wallet à cet agent pour commencer à gérer les fonds
                </p>
              </div>
              <Button
                onClick={handleConnectWalletToAgent}
                disabled={isConnectingWallet}
                className="flex items-center gap-2"
              >
                <Wallet className="h-4 w-4" />
                {isConnectingWallet ? 'Connexion...' : 'Connecter à l\'agent'}
              </Button>
            </div>
          ) : (
            // Wallet connecté, actions disponibles
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Dialog open={isDepositModalOpen} onOpenChange={setIsDepositModalOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center justify-center gap-2 w-full sm:w-auto">
                    <ArrowUpCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Déposer des fonds</span>
                    <span className="sm:hidden">Déposer</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Déposer des fonds</DialogTitle>
                    <DialogDescription>
                      Ajoutez des fonds à votre agent pour augmenter son capital de prêt
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="deposit-amount">Montant (CHZ)</Label>
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
                        Annuler
                      </Button>
                      <Button
                        onClick={handleDeposit}
                        disabled={depositLoading || !depositAmount}
                      >
                        {depositLoading ? 'En cours...' : 'Déposer'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isWithdrawModalOpen} onOpenChange={setIsWithdrawModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center justify-center gap-2 w-full sm:w-auto">
                    <ArrowDownCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Retirer des fonds</span>
                    <span className="sm:hidden">Retirer</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Retirer des fonds</DialogTitle>
                    <DialogDescription>
                      Retirez des fonds de votre agent vers votre wallet
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="withdraw-amount">Montant (CHZ)</Label>
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
                        Capital disponible: {formatBalance(balanceInfo?.available_capital || 0)} CHZ
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="withdraw-address">Adresse de destination (optionnel)</Label>
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
                        Annuler
                      </Button>
                      <Button
                        onClick={handleWithdraw}
                        disabled={withdrawLoading || !withdrawAmount}
                      >
                        {withdrawLoading ? 'En cours...' : 'Retirer'}
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
                <span className="hidden sm:inline">Actualiser</span>
                <span className="sm:hidden">↻</span>
              </Button>

              <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center justify-center gap-2 w-full sm:w-auto">
                    <History className="h-4 w-4" />
                    <span className="hidden sm:inline">Historique</span>
                    <span className="sm:hidden">Hist.</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Historique des transactions</DialogTitle>
                    <DialogDescription>
                      Toutes les transactions de dépôt et retrait pour cet agent
                    </DialogDescription>
                  </DialogHeader>
                  <div className="max-h-96 overflow-y-auto">
                    {transactions.length === 0 ? (
                      <div className="text-center py-8">
                        <History className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">Aucune transaction trouvée</p>
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
                                      {tx.transaction_type === 'deposit' ? 'Dépôt' : 'Retrait'}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {new Date(tx.created_at).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold">
                                    {formatBalance(tx.amount)} CHZ
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