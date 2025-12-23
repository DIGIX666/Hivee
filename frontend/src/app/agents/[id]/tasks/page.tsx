"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Clock, CheckCircle, DollarSign, AlertCircle, XCircle, ArrowLeft } from "lucide-react"
import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

type TaskStatus = "PENDING" | "AWAITING_FUNDS" | "FUNDED" | "IN_PROGRESS" | "COMPLETED" | "PAID" | "FAILED" | "CANCELLED"

interface Task {
  id: string
  taskHash: string
  amount: string
  status: TaskStatus
  description?: string
  zkProofHash?: string
  requiresLoan: boolean
  loanThreshold: string
  createdAt: string
  fundedAt?: string
  completedAt?: string
  paidAt?: string
  loan?: {
    id: string
    status: string
    principal: string
    interestRate: number | null
    expectedRepayment: string | null
    lenderAgent: {
      id: string
      name: string
    } | null
  }
}

const statusConfig = {
  PENDING: { icon: Clock, color: "bg-yellow-500", label: "Pending ZK Proof", textColor: "text-yellow-700" },
  AWAITING_FUNDS: { icon: DollarSign, color: "bg-blue-500", label: "Awaiting Funds", textColor: "text-blue-700", animate: true },
  FUNDED: { icon: CheckCircle, color: "bg-green-500", label: "Funded", textColor: "text-green-700" },
  IN_PROGRESS: { icon: Loader2, color: "bg-blue-500", label: "In Progress", textColor: "text-blue-700", animate: true },
  COMPLETED: { icon: CheckCircle, color: "bg-green-500", label: "Completed", textColor: "text-green-700" },
  PAID: { icon: CheckCircle, color: "bg-emerald-500", label: "Paid", textColor: "text-emerald-700" },
  FAILED: { icon: XCircle, color: "bg-red-500", label: "Failed", textColor: "text-red-700" },
  CANCELLED: { icon: AlertCircle, color: "bg-gray-500", label: "Cancelled", textColor: "text-gray-700" },
}

export default function AgentTasksPage() {
  const params = useParams()
  const agentId = params.id as string

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [agentName, setAgentName] = useState<string>("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch agent info
        const agentRes = await axios.get(`${API_URL}/api/agents/${agentId}`)
        setAgentName(agentRes.data.data.agent.name)

        // Fetch tasks
        const tasksRes = await axios.get(`${API_URL}/api/agents/${agentId}/tasks`)
        setTasks(tasksRes.data.data.tasks)
      } catch (err: any) {
        setError(err.response?.data?.error?.message || "Failed to load tasks")
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Poll every 5 seconds for updates
    const interval = setInterval(async () => {
      try {
        const tasksRes = await axios.get(`${API_URL}/api/agents/${agentId}/tasks`)
        setTasks(tasksRes.data.data.tasks)
      } catch (err) {
        console.error("Failed to refresh tasks:", err)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [agentId])

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Error</CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href={`/agents/${agentId}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Agent
          </Button>
        </Link>
        <h1 className="text-4xl font-bold mb-2">Tasks</h1>
        <p className="text-muted-foreground">
          Track all tasks and funding status for {agentName}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Tasks</CardDescription>
            <CardTitle className="text-3xl">{tasks.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Awaiting Funds</CardDescription>
            <CardTitle className="text-3xl">
              {tasks.filter((t) => t.status === "AWAITING_FUNDS").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl">
              {tasks.filter((t) => ["FUNDED", "IN_PROGRESS"].includes(t.status)).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl">
              {tasks.filter((t) => ["COMPLETED", "PAID"].includes(t.status)).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No tasks yet</p>
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => {
            const StatusIcon = statusConfig[task.status].icon
            const isAwaitingFunds = task.status === "AWAITING_FUNDS"
            const isPending = task.status === "PENDING"

            return (
              <Card
                key={task.id}
                className={
                  isAwaitingFunds
                    ? "border-blue-300 bg-blue-50"
                    : isPending
                    ? "border-yellow-300 bg-yellow-50"
                    : ""
                }
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-full ${statusConfig[task.status].color}`}>
                          <StatusIcon
                            className={`h-4 w-4 text-white ${
                              statusConfig[task.status].animate ? "animate-spin" : ""
                            }`}
                          />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{task.description || "Task"}</CardTitle>
                          <CardDescription className="font-mono text-xs">
                            {task.taskHash.substring(0, 16)}...
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">${task.amount}</p>
                      <Badge variant="secondary" className="mt-1">
                        {statusConfig[task.status].label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="text-xs">{formatDate(task.createdAt)}</p>
                    </div>

                    {task.zkProofHash && (
                      <div>
                        <p className="text-muted-foreground">ZK Proof</p>
                        <p className="font-mono text-xs">{task.zkProofHash.substring(0, 12)}...</p>
                      </div>
                    )}

                    <div>
                      <p className="text-muted-foreground">Loan Required</p>
                      <Badge variant={task.requiresLoan ? "default" : "outline"}>
                        {task.requiresLoan ? "Yes" : "No"}
                      </Badge>
                    </div>

                    {task.fundedAt && (
                      <div>
                        <p className="text-muted-foreground">Funded</p>
                        <p className="text-xs">{formatDate(task.fundedAt)}</p>
                      </div>
                    )}

                    {task.completedAt && (
                      <div>
                        <p className="text-muted-foreground">Completed</p>
                        <p className="text-xs">{formatDate(task.completedAt)}</p>
                      </div>
                    )}
                  </div>

                  {/* Loan Information */}
                  {task.loan && (
                    <div className="border-t pt-4">
                      <p className="text-sm font-semibold mb-3">💰 Loan Details</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Lender</p>
                          <p className="font-medium">
                            {task.loan.lenderAgent ? (
                              task.loan.lenderAgent.name
                            ) : (
                              <span className="text-yellow-600">⏳ Awaiting Lender</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Principal</p>
                          <p className="font-medium">${task.loan.principal}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Interest Rate</p>
                          <p className="font-medium">
                            {task.loan.interestRate !== null ? (
                              `${task.loan.interestRate}bp`
                            ) : (
                              <span className="text-gray-400">TBD</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Expected Repayment</p>
                          <p className="font-medium">
                            {task.loan.expectedRepayment !== null ? (
                              `$${task.loan.expectedRepayment}`
                            ) : (
                              <span className="text-gray-400">TBD</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <Badge variant="outline">{task.loan.status}</Badge>
                        {task.loan.status === "PENDING" && (
                          <p className="text-xs text-muted-foreground mt-2">
                            💡 Waiting for a lender to accept this loan request
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Status Messages */}
                  {isAwaitingFunds && (
                    <div className="mt-4 p-3 bg-blue-100 rounded-md border border-blue-200">
                      <div className="flex items-start gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-semibold text-blue-900">Awaiting Loan Disbursement</p>
                          <p className="text-sm text-blue-700 mt-1">
                            A loan request has been submitted. Waiting for lender approval and fund
                            transfer.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {isPending && (
                    <div className="mt-4 p-3 bg-yellow-100 rounded-md border border-yellow-200">
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="font-semibold text-yellow-900">Generating ZK Proof</p>
                          <p className="text-sm text-yellow-700 mt-1">
                            Creating cryptographic proof of the task. This may take a few seconds.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
