'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { WalletConnectButton } from '@/components/wallet/wallet-connect-button'
import { FundsManagement } from '@/components/wallet/funds-management'
import { useWallet } from '@/hooks/useWallet'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Bot, Wallet } from 'lucide-react'

export default function HomePage() {
  const [agents, setAgents] = useState([])
  const [stats, setStats] = useState(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // États pour le dépôt automatique après création
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [newlyCreatedAgent, setNewlyCreatedAgent] = useState(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositLoading, setDepositLoading] = useState(false)

  // Hook wallet
  const {
    connected,
    isCapxTestnet,
    depositFunds,
    sendTransaction,
    account
  } = useWallet()

  // Simplified API calls
  const fetchAgents = async () => {
    try {
      const response = await fetch('http://localhost:8000/lenders')
      const data = await response.json()
      setAgents(data.agents || [])
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const createAgent = async (agentData) => {
    try {
      setLoading(true)
      const response = await fetch(`http://localhost:8000/lender/create?name=${encodeURIComponent(agentData.name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentData.config),
      })

      if (response.ok) {
        const newAgent = await response.json()
        setAgents(prev => [...prev, newAgent])
        fetchStats()
        setIsCreateModalOpen(false)

        // Si le wallet est connecté et on est sur le bon réseau, proposer le dépôt automatique
        if (connected && isCapxTestnet && agentData.config.available_capital > 0) {
          setNewlyCreatedAgent(newAgent)
          // Convertir le capital en CAPX (pour la démo: 1 USD ≈ 0.01 CAPX, ajustable selon le taux de change)
          const capitalInCAPX = (agentData.config.available_capital * 0.01).toFixed(4)
          setDepositAmount(capitalInCAPX)
          setIsDepositModalOpen(true)
        }
      } else {
        console.error('Failed to create agent')
      }
    } catch (error) {
      console.error('Failed to create agent:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fonction pour effectuer le dépôt automatique
  const handleAutomaticDeposit = async () => {
    if (!newlyCreatedAgent || !depositAmount || !account) return

    setDepositLoading(true)
    try {
      // D'abord envoyer la transaction on-chain (simulation vers adresse agent)
      const tx = await sendTransaction(
        '0x1234567890abcdef1234567890abcdef12345678', // Adresse agent simulée
        depositAmount
      )

      // Ensuite enregistrer le dépôt dans l'API
      await depositFunds(newlyCreatedAgent.id, depositAmount, tx.hash)

      // Fermer la modale et réinitialiser
      setIsDepositModalOpen(false)
      setNewlyCreatedAgent(null)
      setDepositAmount('')

      // Actualiser les données
      fetchAgents()
      fetchStats()
    } catch (error) {
      console.error('Erreur dépôt automatique:', error)
    }
    setDepositLoading(false)
  }

  const handleSkipDeposit = () => {
    setIsDepositModalOpen(false)
    setNewlyCreatedAgent(null)
    setDepositAmount('')
  }

  useEffect(() => {
    fetchAgents()
    fetchStats()
  }, [])

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center space-y-6 mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              AI Agent Management avec WalletConnect
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Deploy and manage autonomous lending agents on the CapX Testnet
            </p>
          </div>

          {/* Action Section */}
          <div className="flex justify-center mb-8">
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white border-0 shadow-lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Deploy New Agent
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-xl">Deploy New AI Lending Agent</DialogTitle>
                  <DialogDescription>
                    Configure your autonomous lending agent parameters. The agent will operate independently using AI-driven risk assessment.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.target)
                  createAgent({
                    name: formData.get('name'),
                    config: {
                      available_capital: parseFloat(formData.get('capital')),
                      max_loan_amount: parseFloat(formData.get('max_loan')),
                      min_credit_score: parseInt(formData.get('min_score')),
                      base_interest_rate: parseFloat(formData.get('interest')),
                      credit_fee_percentage: parseFloat(formData.get('fee_percent')),
                      fixed_processing_fee: parseFloat(formData.get('fixed_fee')),
                      risk_tolerance: formData.get('risk')
                    }
                  })
                }} className="space-y-4">
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="name">Agent Name</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="e.g., Conservative Lender Alpha"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="capital">Available Capital (USD)</Label>
                        <Input
                          id="capital"
                          name="capital"
                          type="number"
                          placeholder="0.1"
                          min="0.1"
                          step="0.1"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="max_loan">Max Loan Amount ($)</Label>
                        <Input
                          id="max_loan"
                          name="max_loan"
                          type="number"
                          placeholder="10000"
                          min="100"
                          step="1"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="min_score">Min Credit Score</Label>
                        <Input
                          id="min_score"
                          name="min_score"
                          type="number"
                          placeholder="650"
                          min="300"
                          max="850"
                          defaultValue="650"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="interest">Interest Rate (%)</Label>
                        <Input
                          id="interest"
                          name="interest"
                          type="number"
                          placeholder="8.0"
                          min="0.1"
                          max="50"
                          step="0.1"
                          defaultValue="8.0"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fee_percent">Fee Percentage (%)</Label>
                        <Input
                          id="fee_percent"
                          name="fee_percent"
                          type="number"
                          placeholder="1.5"
                          min="0"
                          max="10"
                          step="0.1"
                          defaultValue="1.5"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="fixed_fee">Fixed Fee ($)</Label>
                        <Input
                          id="fixed_fee"
                          name="fixed_fee"
                          type="number"
                          placeholder="25"
                          min="0"
                          defaultValue="25"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="risk">Risk Tolerance</Label>
                      <Select name="risk" defaultValue="medium">
                        <SelectTrigger>
                          <SelectValue placeholder="Select risk tolerance" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Conservative</SelectItem>
                          <SelectItem value="medium">Balanced</SelectItem>
                          <SelectItem value="high">Aggressive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white border-0"
                    >
                      {loading ? 'Creating...' : 'Deploy Agent'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Modale de dépôt automatique après création d'agent */}
            <Dialog open={isDepositModalOpen} onOpenChange={setIsDepositModalOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Financer votre agent
                  </DialogTitle>
                  <DialogDescription>
                    Votre agent <strong>{newlyCreatedAgent?.name}</strong> a été créé avec succès !
                    Voulez-vous déposer le capital initial maintenant ?
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">Capital configuré</div>
                    <div className="text-xl font-bold">{depositAmount} CAPX</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      (~${newlyCreatedAgent?.config?.available_capital || 0} USD)
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Ce montant sera déposé depuis votre wallet connecté vers votre agent
                    pour qu'il puisse commencer à prêter de manière autonome.
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleSkipDeposit}
                      disabled={depositLoading}
                      className="flex-1"
                    >
                      Plus tard
                    </Button>
                    <Button
                      onClick={handleAutomaticDeposit}
                      disabled={depositLoading || !connected || !isCapxTestnet}
                      className="flex-1"
                    >
                      {depositLoading ? 'Dépôt...' : 'Déposer maintenant'}
                    </Button>
                  </div>

                  {(!connected || !isCapxTestnet) && (
                    <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                      ⚠️ Wallet non connecté ou réseau incorrect. Connectez-vous au réseau CapX Testnet.
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Test WalletConnect */}
          <div className="mb-8 flex justify-center">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Test WalletConnect
                </CardTitle>
                <CardDescription>
                  Connectez votre wallet MetaMask pour tester l'intégration CapX Testnet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WalletConnectButton size="lg" />
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          {stats && (
            <div className="mb-8">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="card-gradient rounded-lg p-4 text-center">
                  <div className="text-xl font-bold text-foreground">{stats.total_agents}</div>
                  <div className="text-sm text-muted-foreground">Total Agents</div>
                </div>
                <div className="card-gradient rounded-lg p-4 text-center">
                  <div className="text-xl font-bold text-foreground">
                    ${(stats.total_available_capital || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Available Capital</div>
                </div>
                <div className="card-gradient rounded-lg p-4 text-center">
                  <div className="text-xl font-bold text-foreground">
                    ${(stats.total_amount_lent || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Lent</div>
                </div>
                <div className="card-gradient rounded-lg p-4 text-center">
                  <div className="text-xl font-bold text-foreground">
                    ${(stats.total_earnings || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Earnings</div>
                </div>
              </div>
            </div>
          )}

          {/* Agents Section */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 text-center">Your AI Agents</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agents.length === 0 ? (
                <div className="col-span-full">
                  <div className="card-gradient rounded-lg p-8 text-center border-dashed border-2 border-primary/20">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <Bot className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="text-lg font-semibold text-foreground mb-2">No agents deployed</h4>
                    <p className="text-muted-foreground text-sm mb-6">
                      Deploy your first AI agent to start automated lending
                    </p>
                    <Button className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white border-0">
                      <Plus className="h-4 w-4 mr-2" />
                      Deploy First Agent
                    </Button>
                  </div>
                </div>
              ) : (
                agents.map((agent) => (
                  <div key={agent.id} className="card-gradient rounded-lg p-4">
                    <div className="text-lg font-semibold">{agent.name}</div>
                    <div className="text-sm text-muted-foreground">ID: {agent.id.slice(0, 8)}...</div>
                    <div className="mt-2 mb-3">
                      <span className="text-sm">Capital: ${(agent.config?.available_capital || 0).toLocaleString()}</span>
                    </div>
                    <div className="mt-3">
                      <FundsManagement agentId={agent.id} agentName={agent.name} compact={true} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}