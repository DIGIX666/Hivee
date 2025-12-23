"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, Loader2, CheckCircle2, XCircle, Clock, Shield } from "lucide-react"
import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

type AgentStatus = "PENDING" | "SCANNING" | "SCAN_FAILED" | "MODIFYING" | "DEPLOYING" | "ACTIVE" | "PAUSED" | "FAILED"

interface Agent {
  id: string
  name: string
  description?: string
  language: string
  status: AgentStatus
  escrowAddress?: string
  agentIdentityId?: number
  createdAt: string
  updatedAt: string
}

const statusConfig: Record<AgentStatus, { icon: React.ReactNode; color: string; label: string }> = {
  PENDING: { icon: <Clock className="w-4 h-4" />, color: "text-gray-500", label: "Pending" },
  SCANNING: { icon: <Shield className="w-4 h-4 animate-pulse" />, color: "text-blue-500", label: "Scanning" },
  SCAN_FAILED: { icon: <XCircle className="w-4 h-4" />, color: "text-red-500", label: "Scan Failed" },
  MODIFYING: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: "text-purple-500", label: "Modifying" },
  DEPLOYING: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: "text-orange-500", label: "Deploying" },
  ACTIVE: { icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-500", label: "Active" },
  PAUSED: { icon: <Clock className="w-4 h-4" />, color: "text-yellow-500", label: "Paused" },
  FAILED: { icon: <XCircle className="w-4 h-4" />, color: "text-red-500", label: "Failed" },
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/agents`)
      setAgents(response.data.data.agents)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to load agents")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-900 dark:text-red-100">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Agents</h1>
          <p className="text-muted-foreground">Manage your uploaded AI agents</p>
        </div>
        <Link href="/upload">
          <Button>
            <Upload className="w-4 h-4 mr-2" />
            Upload New Agent
          </Button>
        </Link>
      </div>

      {agents.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
            <p className="text-muted-foreground mb-6">Upload your first agent to get started</p>
            <Link href="/upload">
              <Button>Upload Agent</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {agents.map((agent) => {
            const status = statusConfig[agent.status]
            return (
              <Link key={agent.id} href={`/agents/${agent.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="mb-1">{agent.name}</CardTitle>
                        {agent.description && (
                          <CardDescription>{agent.description}</CardDescription>
                        )}
                      </div>
                      <div className={`flex items-center gap-2 ${status.color}`}>
                        {status.icon}
                        <span className="text-sm font-medium">{status.label}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Language</p>
                        <p className="font-medium capitalize">{agent.language}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Identity ID</p>
                        <p className="font-medium">
                          {agent.agentIdentityId !== null ? `#${agent.agentIdentityId}` : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Escrow</p>
                        <p className="font-mono text-xs">
                          {agent.escrowAddress ? `${agent.escrowAddress.slice(0, 6)}...${agent.escrowAddress.slice(-4)}` : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Created</p>
                        <p className="font-medium">
                          {new Date(agent.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
