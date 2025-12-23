'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useLenderAPI } from '@/hooks/useLenderAPI'
import { X, DollarSign, Shield, Percent, Hash } from 'lucide-react'

export default function CreateAgentModal({ isOpen, onClose, onAgentCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    available_capital: '',
    max_loan_amount: '',
    min_credit_score: 650,
    base_interest_rate: 8.0,
    credit_fee_percentage: 1.5,
    fixed_processing_fee: 25,
    risk_tolerance: 'medium'
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const { createAgent, error } = useLenderAPI()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const agent = await createAgent(formData.name, {
        available_capital: parseFloat(formData.available_capital),
        max_loan_amount: parseFloat(formData.max_loan_amount),
        min_credit_score: parseInt(formData.min_credit_score),
        base_interest_rate: parseFloat(formData.base_interest_rate),
        credit_fee_percentage: parseFloat(formData.credit_fee_percentage),
        fixed_processing_fee: parseFloat(formData.fixed_processing_fee),
        risk_tolerance: formData.risk_tolerance
      })

      onAgentCreated?.(agent)
      onClose()

      // Reset form
      setFormData({
        name: '',
        available_capital: '',
        max_loan_amount: '',
        min_credit_score: 650,
        base_interest_rate: 8.0,
        credit_fee_percentage: 1.5,
        fixed_processing_fee: 25,
        risk_tolerance: 'medium'
      })
    } catch (err) {
      console.error('Failed to create agent:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const riskLevels = [
    { value: 'low', label: 'Conservative', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    { value: 'medium', label: 'Balanced', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    { value: 'high', label: 'Aggressive', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <Card className="bg-card border-0 shadow-none">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Create New Lending Agent</CardTitle>
                <CardDescription>
                  Configure your autonomous lending agent parameters
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Agent Name</label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="My Lending Agent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Available Capital (CAPX)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      type="number"
                      value={formData.available_capital}
                      onChange={(e) => setFormData({...formData, available_capital: e.target.value})}
                      placeholder="50000"
                      className="pl-10"
                      min="100"
                      step="100"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Lending Limits */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Max Loan Amount (CAPX)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      type="number"
                      value={formData.max_loan_amount}
                      onChange={(e) => setFormData({...formData, max_loan_amount: e.target.value})}
                      placeholder="10000"
                      className="pl-10"
                      min="100"
                      step="100"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Min Credit Score</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      type="number"
                      value={formData.min_credit_score}
                      onChange={(e) => setFormData({...formData, min_credit_score: e.target.value})}
                      placeholder="650"
                      className="pl-10"
                      min="300"
                      max="850"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Rates and Fees */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Interest Rate (%)</label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      type="number"
                      value={formData.base_interest_rate}
                      onChange={(e) => setFormData({...formData, base_interest_rate: e.target.value})}
                      placeholder="8.0"
                      className="pl-10"
                      min="0.1"
                      max="50"
                      step="0.1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Fee Percentage (%)</label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      type="number"
                      value={formData.credit_fee_percentage}
                      onChange={(e) => setFormData({...formData, credit_fee_percentage: e.target.value})}
                      placeholder="1.5"
                      className="pl-10"
                      min="0"
                      max="10"
                      step="0.1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Fixed Fee (CAPX)</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      type="number"
                      value={formData.fixed_processing_fee}
                      onChange={(e) => setFormData({...formData, fixed_processing_fee: e.target.value})}
                      placeholder="25"
                      className="pl-10"
                      min="0"
                      step="1"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Risk Tolerance */}
              <div>
                <label className="block text-sm font-medium mb-3">Risk Tolerance</label>
                <div className="flex gap-3">
                  {riskLevels.map((risk) => (
                    <button
                      key={risk.value}
                      type="button"
                      onClick={() => setFormData({...formData, risk_tolerance: risk.value})}
                      className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                        formData.risk_tolerance === risk.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Badge className={risk.color} variant="secondary">
                        {risk.label}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Agent'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}