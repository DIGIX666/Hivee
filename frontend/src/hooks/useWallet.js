'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { ethers } from 'ethers'

// Wallet Context
const WalletContext = createContext()

// Configuration pour Chiliz Spicy Testnet
const CHILIZ_SPICY_NETWORK_CONFIG = {
  chainId: '0x15B32', // 88882 en hexadécimal
  chainName: 'Chiliz Spicy Testnet',
  rpcUrls: ['https://chiliz-spicy-rpc.publicnode.com'],
  nativeCurrency: {
    name: 'Chiliz',
    symbol: 'CHZ',
    decimals: 18,
  },
  blockExplorerUrls: ['https://spicy-explorer.chiliz.com'],
}

// API URL de l'agent lender
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

  // Vérifier la connexion existante au chargement
  useEffect(() => {
    checkConnection()
  }, [])

  // Écouter les changements d'account/réseau
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
        window.location.reload() // Recommandé par MetaMask
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

          // Passer le provider explicitement pour éviter les problèmes de timing
          await updateBalance(address, provider)
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la connexion:', error)
    }
  }

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('MetaMask n\'est pas installé')
      return false
    }

    setConnecting(true)
    setError(null)

    try {
      console.log('ConnectWallet: requesting accounts')
      // Demander la connexion
      await window.ethereum.request({ method: 'eth_requestAccounts' })

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      const network = await provider.getNetwork()

      console.log('ConnectWallet: connected to', { address, chainId: network.chainId.toString() })

      // Vérifier si on est sur le bon réseau
      if (network.chainId !== 88882n) {
        const switchResult = await switchToChilizSpicyNetwork()
        if (!switchResult) {
          setConnecting(false)
          return false
        }
        // Attendre un peu pour que MetaMask se mette à jour
        await new Promise(resolve => setTimeout(resolve, 1000))
        // Recharger le provider et le réseau après le switch
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
      console.error('Erreur de connexion:', error)
      setError(error.message)
      setConnecting(false)
      return false
    }
  }

  const switchToChilizSpicyNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CHILIZ_SPICY_NETWORK_CONFIG.chainId }],
      })
      return true
    } catch (error) {
      // Si le réseau n'existe pas, l'ajouter
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [CHILIZ_SPICY_NETWORK_CONFIG],
          })
          return true
        } catch (addError) {
          console.error('Erreur lors de l\'ajout du réseau:', addError)
          setError('Impossible d\'ajouter le réseau Chiliz Spicy')
          return false
        }
      }
      console.error('Erreur lors du changement de réseau:', error)
      setError('Impossible de changer vers le réseau Chiliz Spicy')
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
      console.error('Erreur lors de la récupération du balance:', error)
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

  // Fonctions d'intégration avec l'API Agent Lender
  const initiateWalletConnection = async (agentId) => {
    try {
      const response = await fetch(`${LENDER_API_URL}/wallet/connect?agent_id=${agentId}`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Échec de l\'initiation de la connexion')
      }

      return await response.json()
    } catch (error) {
      console.error('Erreur initiation connexion:', error)
      throw error
    }
  }

  const confirmWalletConnection = async (sessionId, walletAddress, chainId = 88882) => {
    try {
      const url = `${LENDER_API_URL}/wallet/confirm?session_id=${encodeURIComponent(sessionId)}&wallet_address=${encodeURIComponent(walletAddress)}&chain_id=${chainId}`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('API Error:', errorData)
        throw new Error('Échec de la confirmation de connexion')
      }

      return await response.json()
    } catch (error) {
      console.error('Erreur confirmation connexion:', error)
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
        throw new Error(`Échec du dépôt: ${response.status} - ${errorText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Erreur dépôt:', error)
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
        throw new Error('Échec du retrait')
      }

      return await response.json()
    } catch (error) {
      console.error('Erreur retrait:', error)
      throw error
    }
  }

  const getAgentWalletInfo = async (agentId) => {
    try {
      const response = await fetch(`${LENDER_API_URL}/wallet/${agentId}`)

      if (!response.ok) {
        if (response.status === 404) {
          return null // Pas encore de wallet connecté
        }
        throw new Error('Échec de la récupération des infos wallet')
      }

      return await response.json()
    } catch (error) {
      console.error('Erreur récupération wallet info:', error)
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
        throw new Error('Échec de la récupération de l\'historique')
      }

      return await response.json()
    } catch (error) {
      console.error('Erreur historique transactions:', error)
      throw error
    }
  }

  const getAgentFundsBalance = async (agentId) => {
    try {
      const response = await fetch(`${LENDER_API_URL}/wallet/${agentId}/balance`)

      if (!response.ok) {
        throw new Error('Échec de la récupération du solde')
      }

      return await response.json()
    } catch (error) {
      console.error('Erreur récupération solde:', error)
      throw error
    }
  }

  const sendTransaction = async (to, amount, data = '0x') => {
    if (!signer) {
      throw new Error('Wallet non connecté')
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
      console.error('Erreur envoi transaction:', error)
      throw error
    }
  }

  const value = {
    // État du wallet
    account,
    provider,
    signer,
    balance,
    connected,
    connecting,
    chainId,
    error,

    // Actions du wallet
    connectWallet,
    disconnect,
    switchToChilizSpicyNetwork,
    updateBalance,
    sendTransaction,

    // Intégration Agent Lender
    initiateWalletConnection,
    confirmWalletConnection,
    depositFunds,
    withdrawFunds,
    getAgentWalletInfo,
    getTransactionHistory,
    getAgentFundsBalance,

    // Utilitaires
    isChilizSpicyNetwork: chainId === '88882',
    formatBalance: (bal) => parseFloat(bal || 0).toFixed(4),
  }

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet doit être utilisé dans un WalletProvider')
  }
  return context
}