'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { ethers } from 'ethers'

// Wallet Context
const WalletContext = createContext()

// Configuration for CapX Testnet
const CAPX_TESTNET_NETWORK_CONFIG = {
  chainId: '0x2F4', // 756 en hexadécimal
  chainName: 'Capx Testnet',
  rpcUrls: ['https://capx-testnet-c1.rpc.caldera.xyz/http'],
  nativeCurrency: {
    name: 'CAPX',
    symbol: 'CAPX',
    decimals: 18,
  },
  blockExplorerUrls: ['https://capx-testnet-c1.explorer.caldera.xyz'],
}

// Lender agent API URL
const LENDER_API_URL = 'http://localhost:8000'

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null)
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [balance, setBalance] = useState('0')
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [chainId, setChainId] = useState(null)
  const [error, setError] = useState(null)

  // Check existing connection on load
  useEffect(() => {
    checkConnection()
  }, [])

  // Listen to account/network changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnect()
        } else if (accounts[0] !== account) {
          setAccount(accounts[0])
          updateBalance(accounts[0])
        }
      }

      const handleChainChanged = (chainId) => {
        setChainId(chainId)
        window.location.reload() // Recommended by MetaMask
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [account])

  const checkConnection = async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await provider.listAccounts()

        if (accounts.length > 0) {
          const signer = await provider.getSigner()
          const address = await signer.getAddress()
          const network = await provider.getNetwork()

          console.log('CheckConnection: found existing connection', { address, chainId: network.chainId.toString() })

          setProvider(provider)
          setSigner(signer)
          setAccount(address)
          setChainId(network.chainId.toString())
          setConnected(true)

          // Pass provider explicitly to avoid timing issues
          await updateBalance(address, provider)
        }
      }
    } catch (error) {
      console.error('Error checking connection:', error)
    }
  }

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('MetaMask is not installed')
      return false
    }

    setConnecting(true)
    setError(null)

    try {
      console.log('ConnectWallet: requesting accounts')
      // Request connection
      await window.ethereum.request({ method: 'eth_requestAccounts' })

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      const network = await provider.getNetwork()

      console.log('ConnectWallet: connected to', { address, chainId: network.chainId.toString() })

      // Check if we're on the correct network
      if (network.chainId !== 756n) {
        const switchResult = await switchToCapxTestnetNetwork()
        if (!switchResult) {
          setConnecting(false)
          return false
        }
        // Wait a bit for MetaMask to update
        await new Promise(resolve => setTimeout(resolve, 1000))
        // Reload provider and network after switch
        const newProvider = new ethers.BrowserProvider(window.ethereum)
        const newSigner = await newProvider.getSigner()
        const newNetwork = await newProvider.getNetwork()

        setProvider(newProvider)
        setSigner(newSigner)
        setChainId(newNetwork.chainId.toString())
        setConnected(true)
        setAccount(address)
        await updateBalance(address, newProvider)
      } else {
        setProvider(provider)
        setSigner(signer)
        setAccount(address)
        setChainId(network.chainId.toString())
        setConnected(true)
        await updateBalance(address, provider)
      }

      setConnecting(false)
      return true
    } catch (error) {
      console.error('Connection error:', error)
      setError(error.message)
      setConnecting(false)
      return false
    }
  }

  const switchToCapxTestnetNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CAPX_TESTNET_NETWORK_CONFIG.chainId }],
      })
      return true
    } catch (error) {
      // If the network doesn't exist, add it
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [CAPX_TESTNET_NETWORK_CONFIG],
          })
          return true
        } catch (addError) {
          console.error('Error adding network:', addError)
          setError('Unable to add CapX Testnet network')
          return false
        }
      }
      console.error('Error changing network:', error)
      setError('Unable to switch to CapX Testnet network')
      return false
    }
  }

  const updateBalance = async (address, customProvider = null) => {
    const activeProvider = customProvider || provider
    if (!activeProvider || !address) {
      console.log('UpdateBalance: missing provider or address', { activeProvider: !!activeProvider, address })
      return
    }

    try {
      console.log('UpdateBalance: fetching balance for', address)
      const network = await activeProvider.getNetwork()
      console.log('UpdateBalance: network', network.chainId)

      const balance = await activeProvider.getBalance(address)
      const formattedBalance = ethers.formatEther(balance)
      console.log('UpdateBalance: raw balance', balance.toString())
      console.log('UpdateBalance: formatted balance', formattedBalance)
      setBalance(formattedBalance)
    } catch (error) {
      console.error('Error fetching balance:', error)
      setBalance('0')
    }
  }

  const disconnect = () => {
    setAccount(null)
    setProvider(null)
    setSigner(null)
    setBalance('0')
    setConnected(false)
    setChainId(null)
    setError(null)
  }

  // Lender Agent API integration functions
  const initiateWalletConnection = async (agentId) => {
    try {
      const response = await fetch(`${LENDER_API_URL}/wallet/connect?agent_id=${agentId}`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to initiate connection')
      }

      return await response.json()
    } catch (error) {
      console.error('Error initiating connection:', error)
      throw error
    }
  }

  const confirmWalletConnection = async (sessionId, walletAddress, chainId = 756) => {
    try {
      const url = `${LENDER_API_URL}/wallet/confirm?session_id=${encodeURIComponent(sessionId)}&wallet_address=${encodeURIComponent(walletAddress)}&chain_id=${chainId}`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('API Error:', errorData)
        throw new Error('Failed to confirm connection')
      }

      return await response.json()
    } catch (error) {
      console.error('Error confirming connection:', error)
      throw error
    }
  }

  const depositFunds = async (agentId, amount, transactionHash = null) => {
    try {
      const depositData = {
        agent_id: agentId,
        amount: parseFloat(amount),
        wallet_address: account,
        transaction_hash: transactionHash
      }

      console.log('DepositFunds: sending request', { url: `${LENDER_API_URL}/funds/deposit`, depositData })

      const response = await fetch(`${LENDER_API_URL}/funds/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(depositData),
      })

      console.log('DepositFunds: response status', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('DepositFunds: API error', { status: response.status, error: errorText })
        throw new Error(`Deposit failed: ${response.status} - ${errorText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Deposit error:', error)
      throw error
    }
  }

  const withdrawFunds = async (agentId, amount, destinationAddress) => {
    try {
      const withdrawData = {
        agent_id: agentId,
        amount: parseFloat(amount),
        destination_address: destinationAddress || account
      }

      const response = await fetch(`${LENDER_API_URL}/funds/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withdrawData),
      })

      if (!response.ok) {
        throw new Error('Withdrawal failed')
      }

      return await response.json()
    } catch (error) {
      console.error('Withdrawal error:', error)
      throw error
    }
  }

  const getAgentWalletInfo = async (agentId) => {
    try {
      const response = await fetch(`${LENDER_API_URL}/wallet/${agentId}`)

      if (!response.ok) {
        if (response.status === 404) {
          return null // No wallet connected yet
        }
        throw new Error('Failed to retrieve wallet info')
      }

      return await response.json()
    } catch (error) {
      console.error('Error retrieving wallet info:', error)
      throw error
    }
  }

  const getTransactionHistory = async (agentId, transactionType = null) => {
    try {
      let url = `${LENDER_API_URL}/funds/${agentId}/transactions`
      if (transactionType) {
        url += `?transaction_type=${transactionType}`
      }

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to retrieve history')
      }

      return await response.json()
    } catch (error) {
      console.error('Transaction history error:', error)
      throw error
    }
  }

  const getAgentFundsBalance = async (agentId) => {
    try {
      const response = await fetch(`${LENDER_API_URL}/wallet/${agentId}/balance`)

      if (!response.ok) {
        throw new Error('Failed to retrieve balance')
      }

      return await response.json()
    } catch (error) {
      console.error('Error retrieving balance:', error)
      throw error
    }
  }

  const sendTransaction = async (to, amount, data = '0x') => {
    if (!signer) {
      throw new Error('Wallet not connected')
    }

    try {
      const tx = {
        to,
        value: ethers.parseEther(amount.toString()),
        data
      }

      const transaction = await signer.sendTransaction(tx)
      return transaction
    } catch (error) {
      console.error('Error sending transaction:', error)
      throw error
    }
  }

  const value = {
    // Wallet state
    account,
    provider,
    signer,
    balance,
    connected,
    connecting,
    chainId,
    error,

    // Wallet actions
    connectWallet,
    disconnect,
    switchToCapxTestnetNetwork,
    updateBalance,
    sendTransaction,

    // Lender Agent Integration
    initiateWalletConnection,
    confirmWalletConnection,
    depositFunds,
    withdrawFunds,
    getAgentWalletInfo,
    getTransactionHistory,
    getAgentFundsBalance,

    // Utilities
    isCapxTestnet: chainId === '756',
    formatBalance: (bal) => parseFloat(bal || 0).toFixed(4),
  }

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}