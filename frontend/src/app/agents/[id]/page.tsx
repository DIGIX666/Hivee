"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle, FileText } from "lucide-react"
import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

type AgentStatus = "PENDING" | "SCANNING" | "SCAN_FAILED" | "MODIFYING" | "DEPLOYING" | "ACTIVE" | "PAUSED" | "FAILED"

interface Agent {
  id: string
  name: string
  description: string
  language: string
  status: AgentStatus
  codeHash: string
  escrowAddress?: string
  originalPaymentAddress?: string
  agentIdentityId?: number
  createdAt: string
  updatedAt: string
}

const statusConfig = {
  PENDING: { icon: Clock, color: "bg-yellow-500", label: "Pending" },
  SCANNING: { icon: Loader2, color: "bg-blue-500", label: "Scanning", animate: true },
  SCAN_FAILED: { icon: XCircle, color: "bg-red-500", label: "Scan Failed" },
  MODIFYING: { icon: Loader2, color: "bg-blue-500", label: "Modifying Code", animate: true },
  DEPLOYING: { icon: Loader2, color: "bg-blue-500", label: "Deploying", animate: true },
  ACTIVE: { icon: CheckCircle2, color: "bg-green-500", label: "Active" },
  PAUSED: { icon: AlertCircle, color: "bg-gray-500", label: "Paused" },
  FAILED: { icon: XCircle, color: "bg-red-500", label: "Failed" },
}

export default function AgentDetailPage() {
  const params = useParams()
  const agentId = params.id as string

  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/agents/${agentId}`)
        setAgent(response.data.data.agent)
      } catch (err: any) {
        setError(err.response?.data?.error?.message || "Failed to load agent")
      } finally {
        setLoading(false)
      }
    }

    fetchAgent()

    // Poll for updates every 3 seconds if agent is processing
    const interval = setInterval(() => {
      if (agent && !["ACTIVE", "FAILED", "SCAN_FAILED", "PAUSED"].includes(agent.status)) {
        fetchAgent()
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [agentId, agent?.status])

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Error</CardTitle>
            <CardDescription className="text-red-600">
              {error || "Agent not found"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const StatusIcon = statusConfig[agent.status].icon
  const isProcessing = ["PENDING", "SCANNING", "MODIFYING", "DEPLOYING"].includes(agent.status)

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{agent.name}</h1>
        <p className="text-muted-foreground">{agent.description}</p>
      </div>

      <div className="space-y-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${statusConfig[agent.status].color}`}>
                <StatusIcon
                  className={`h-5 w-5 text-white ${statusConfig[agent.status].animate ? 'animate-spin' : ''}`}
                />
              </div>
              <div>
                <p className="font-semibold">{statusConfig[agent.status].label}</p>
                {isProcessing && (
                  <p className="text-sm text-muted-foreground">Processing your agent...</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Language</p>
                <Badge variant="secondary">{agent.language}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Agent ID</p>
                <p className="font-mono text-sm">{agent.id}</p>
              </div>
            </div>

            {agent.agentIdentityId && (
              <div>
                <p className="text-sm text-muted-foreground">Identity Token ID</p>
                <p className="font-mono text-sm">{agent.agentIdentityId}</p>
              </div>
            )}

            {(agent.escrowAddress || agent.originalPaymentAddress) && (
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-semibold">Payment Addresses</p>

                {agent.originalPaymentAddress && (
                  <div>
                    <p className="text-sm text-muted-foreground">Original Payment Address</p>
                    <p className="font-mono text-xs break-all text-gray-600">
                      {agent.originalPaymentAddress}
                    </p>
                  </div>
                )}

                {agent.escrowAddress && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Escrow Address {agent.originalPaymentAddress && "(Current)"}
                    </p>
                    <p className="font-mono text-sm break-all text-green-700">
                      {agent.escrowAddress}
                    </p>
                  </div>
                )}

                {agent.originalPaymentAddress && agent.escrowAddress && (
                  <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                    <p className="text-xs text-blue-800">
                      ℹ️ The original payment address has been replaced with the escrow address
                      for secure payment processing on the Hivee platform.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground">Code Hash</p>
              <p className="font-mono text-xs break-all">{agent.codeHash}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm">{new Date(agent.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Updated</p>
                <p className="text-sm">{new Date(agent.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Processing Info */}
        {isProcessing && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900">Processing Pipeline</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Your agent is being processed. This includes security scanning, code modification,
                    and deployment. This page will update automatically.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Info */}
        {(agent.status === "FAILED" || agent.status === "SCAN_FAILED") && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">Processing Failed</p>
                  <p className="text-sm text-red-700 mt-1">
                    {agent.status === "SCAN_FAILED"
                      ? "Security scan detected issues with your agent code."
                      : "An error occurred while processing your agent."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success Info */}
        {agent.status === "ACTIVE" && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-green-900">Agent is Active</p>
                  <p className="text-sm text-green-700 mt-1">
                    Your agent has been successfully deployed and is ready to use.
                  </p>
                  <Link href={`/agents/${agent.id}/tasks`}>
                    <Button variant="outline" size="sm" className="mt-3">
                      <FileText className="h-4 w-4 mr-2" />
                      View Tasks & Funding Status
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
