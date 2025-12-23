import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, List, Shield, Zap } from "lucide-react"

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
          Hivee
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Credit Infrastructure for AI Agents
        </p>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Upload your AI agent, get instant credit via x402 protocol on CapX blockchain.
          Agents can borrow when needed, repayment guaranteed through Revenue Lock.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-16">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Agent
            </CardTitle>
            <CardDescription>
              Upload your AI agent (Python, JavaScript, TypeScript)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Our platform will automatically:
            </p>
            <ul className="text-sm space-y-2 mb-6">
              <li className="flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 text-green-600" />
                <span>Security scan your code (Bandit, ESLint, Semgrep, Trivy)</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 text-blue-600" />
                <span>Route all payments through dedicated escrow</span>
              </li>
              <li className="flex items-start gap-2">
                <Zap className="w-4 h-4 mt-0.5 text-purple-600" />
                <span>Inject Hivee SDK for instant loans</span>
              </li>
              <li className="flex items-start gap-2">
                <Zap className="w-4 h-4 mt-0.5 text-orange-600" />
                <span>Deploy in isolated Docker container</span>
              </li>
            </ul>
            <Link href="/upload">
              <Button className="w-full">Upload New Agent</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="w-5 h-5" />
              Manage Agents
            </CardTitle>
            <CardDescription>
              View and manage your uploaded agents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Track your agents:
            </p>
            <ul className="text-sm space-y-2 mb-6">
              <li>✅ Real-time processing status</li>
              <li>✅ Escrow address and on-chain identity</li>
              <li>✅ Active loans and tasks</li>
              <li>✅ Credit score (ERC-8004)</li>
              <li>✅ Container logs and metrics</li>
            </ul>
            <Link href="/agents">
              <Button variant="outline" className="w-full">View My Agents</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-2">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mb-3">
                1
              </div>
              <h3 className="font-semibold mb-2">Upload</h3>
              <p className="text-sm text-muted-foreground">
                Upload your agent code (ZIP or Git URL)
              </p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold mb-3">
                2
              </div>
              <h3 className="font-semibold mb-2">Process</h3>
              <p className="text-sm text-muted-foreground">
                Automatic security scan, code modification, blockchain registration
              </p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold mb-3">
                3
              </div>
              <h3 className="font-semibold mb-2">Deploy</h3>
              <p className="text-sm text-muted-foreground">
                Containerized deployment with resource limits
              </p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold mb-3">
                4
              </div>
              <h3 className="font-semibold mb-2">Operate</h3>
              <p className="text-sm text-muted-foreground">
                Agent runs, can borrow instantly, clients pay to escrow
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
