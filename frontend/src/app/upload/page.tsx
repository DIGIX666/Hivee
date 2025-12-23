"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, FileCode, Loader2, CheckCircle2, XCircle } from "lucide-react"
import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

type AgentLanguage = "python" | "javascript" | "typescript"

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    language: "python" as AgentLanguage,
    gitUrl: "",
  })
  const [uploadMode, setUploadMode] = useState<"file" | "git">("file")
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null
    message: string
    agentId?: string
  }>({ type: null, message: "" })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      setUploadStatus({ type: null, message: "" })
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/zip": [".zip"],
      "application/x-tar": [".tar"],
      "application/gzip": [".tar.gz", ".tgz"],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)
    setUploadStatus({ type: null, message: "" })

    try {
      const data = new FormData()
      data.append("name", formData.name)
      data.append("description", formData.description)
      data.append("language", formData.language)

      if (uploadMode === "file" && file) {
        data.append("file", file)
      } else if (uploadMode === "git" && formData.gitUrl) {
        data.append("gitUrl", formData.gitUrl)
      } else {
        throw new Error("Please provide either a file or Git URL")
      }

      const response = await axios.post(`${API_URL}/api/agents`, data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      const agentId = response.data.data.agent.id

      setUploadStatus({
        type: "success",
        message: `Agent uploaded successfully! Processing started...`,
        agentId,
      })

      // Redirect to agent detail page after 2 seconds
      setTimeout(() => {
        router.push(`/agents/${agentId}`)
      }, 2000)
    } catch (error: any) {
      setUploadStatus({
        type: "error",
        message: error.response?.data?.error?.message || error.message || "Upload failed",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Upload Agent</h1>
        <p className="text-muted-foreground">
          Upload your AI agent to get instant credit access on Hivee
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload Method</CardTitle>
          <CardDescription>Choose how to upload your agent</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              variant={uploadMode === "file" ? "default" : "outline"}
              onClick={() => setUploadMode("file")}
              className="flex-1"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload ZIP File
            </Button>
            <Button
              variant={uploadMode === "git" ? "default" : "outline"}
              onClick={() => setUploadMode("git")}
              className="flex-1"
            >
              <FileCode className="w-4 h-4 mr-2" />
              Git Repository
            </Button>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Agent Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Agent Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Research Agent"
                required
                minLength={3}
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Agent that performs research tasks..."
                maxLength={500}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Language *</label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value as AgentLanguage })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {uploadMode === "file" ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Upload File</CardTitle>
              <CardDescription>
                Upload a ZIP, TAR, or TAR.GZ file (max 100MB)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary"
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                {file ? (
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : isDragActive ? (
                  <p>Drop the file here...</p>
                ) : (
                  <div>
                    <p className="mb-2">Drag & drop your agent code here</p>
                    <p className="text-sm text-muted-foreground">or click to browse</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Git Repository</CardTitle>
              <CardDescription>
                Provide a public Git repository URL
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                value={formData.gitUrl}
                onChange={(e) => setFormData({ ...formData, gitUrl: e.target.value })}
                placeholder="https://github.com/user/agent-repo"
                type="url"
                required={uploadMode === "git"}
              />
            </CardContent>
          </Card>
        )}

        {uploadStatus.type && (
          <Card className={`mb-6 ${uploadStatus.type === "success" ? "border-green-500" : "border-red-500"}`}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                {uploadStatus.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${uploadStatus.type === "success" ? "text-green-900 dark:text-green-100" : "text-red-900 dark:text-red-100"}`}>
                    {uploadStatus.message}
                  </p>
                  {uploadStatus.agentId && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Agent ID: {uploadStatus.agentId}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/")}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={uploading || (uploadMode === "file" && !file) || !formData.name}
            className="flex-1"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Agent
              </>
            )}
          </Button>
        </div>
      </form>

      <Card className="mt-8 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-lg">What happens next?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>✅ <strong>Security Scan</strong>: Your code will be scanned with Bandit, ESLint, Semgrep, and Trivy</p>
          <p>✅ <strong>Code Modification</strong>: Payment addresses replaced with escrow, SDK injected</p>
          <p>✅ <strong>Blockchain Registration</strong>: ERC-8004 identity created, escrow contract deployed</p>
          <p>✅ <strong>Containerization</strong>: Isolated Docker container with resource limits</p>
          <p>✅ <strong>Activation</strong>: Agent ready to receive tasks and request loans!</p>
        </CardContent>
      </Card>
    </div>
  )
}
