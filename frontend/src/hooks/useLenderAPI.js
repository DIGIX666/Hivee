import { useState, useEffect } from 'react'

const API_BASE_URL = 'http://localhost:8000'

export function useLenderAPI() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const apiCall = async (endpoint, options = {}) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // API methods
  const getAgents = () => apiCall('/lenders')

  const getAgent = (agentId) => apiCall(`/lender/${agentId}`)

  const createAgent = (name, config) => apiCall(`/lender/create?name=${encodeURIComponent(name)}`, {
    method: 'POST',
    body: JSON.stringify(config),
  })

  const calculateLoanCosts = (agentId, loanAmount, durationDays) =>
    apiCall(`/lender/${agentId}/calculate-costs?loan_amount=${loanAmount}&duration_days=${durationDays}`, {
      method: 'POST',
    })

  const evaluateLoan = (agentId, loanRequest) => apiCall(`/lender/${agentId}/evaluate`, {
    method: 'POST',
    body: JSON.stringify(loanRequest),
  })

  const getStats = () => apiCall('/stats')

  const getAgentPortfolio = (agentId) => apiCall(`/lender/${agentId}/portfolio`)

  return {
    loading,
    error,
    getAgents,
    getAgent,
    createAgent,
    calculateLoanCosts,
    evaluateLoan,
    getStats,
    getAgentPortfolio,
  }
}