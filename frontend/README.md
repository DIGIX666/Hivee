# Hivee Frontend

AI Agent Platform - Upload, manage, and monitor your AI agents with instant credit access.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **HTTP Client**: Axios

## Getting Started

### Prerequisites

- Node.js >= 18.x
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.local.example .env.local

# Edit .env.local with your backend URL
# NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Development

```bash
# Run development server
pnpm dev

# Server will start on http://localhost:3000
```

### Build for Production

```bash
# Build
pnpm build

# Start production server
pnpm start
```

## Project Structure

```
src/
├── app/
│   ├── agents/          # Agent management pages
│   │   ├── page.tsx     # List all agents
│   │   └── [id]/        # Agent detail & tasks
│   ├── upload/          # Agent upload page
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Homepage
│   └── globals.css      # Global styles
├── components/
│   └── ui/              # shadcn/ui components
├── lib/
│   └── utils.ts         # Utility functions
└── types/               # TypeScript types
```

## Features

### Agent Management
- Upload AI agents (ZIP file or Git repository)
- Real-time status tracking (scanning, modifying, deploying)
- View agent details and blockchain info

### Task Monitoring
- Track agent tasks in real-time
- View ZK proof generation
- Monitor loan requests and status

### Responsive Design
- Mobile-friendly interface
- Dark mode support
- Optimized for all screen sizes

## Environment Variables

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow React best practices
- Use functional components with hooks
- Implement proper error handling

### Component Guidelines
- Use shadcn/ui components when possible
- Keep components focused and reusable
- Use proper TypeScript types for props

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)


