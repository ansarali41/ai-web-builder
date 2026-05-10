<div align="center">

# AI Web Builder

### Generate React Websites from Natural Language

Describe a website in plain English. Get a complete, production-ready React + Tailwind project with live preview — in seconds.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4)](https://ai.google.dev/)
[![Convex](https://img.shields.io/badge/Convex-Backend-EE342F)](https://convex.dev/)

---

[Getting Started](#getting-started) · [Features](#features) · [Tech Stack](#tech-stack) · [Deployment](#deployment)

</div>

---

## Overview

AI Web Builder turns short descriptions into multi-file React projects. It generates components, applies modern Tailwind styling, runs everything in a live Sandpack preview, and lets you export the project as a ZIP. Powered by Google Gemini 2.5 Flash with a free tier generous enough for daily use.

---

## Features

| Feature | Description |
|---------|-------------|
| **AI Code Generation** | Gemini 2.5 Flash converts prompts into complete React applications |
| **Live Preview** | Sandpack-embedded IDE shows your app instantly with hot reload |
| **Multi-File Output** | Organized component structure (App.js, /components/*, etc.) |
| **Prompt Enhancement** | One-click "Enhance" expands rough ideas into detailed specs |
| **Chat History** | Local-first history of past generations, click to reopen |
| **Iterative Editing** | Chat with the AI to refine generated code |
| **Export** | Download the full project as a ZIP, ready to `npm install && npm run dev` |
| **Minimalist UI** | Clean, v0.dev-inspired design — no clutter |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A free [Gemini API key](https://aistudio.google.com/apikey)
- A free [Convex account](https://convex.dev)

### Installation

```bash
git clone https://github.com/ansarali41/ai-web-builder.git
cd ai-web-builder
npm install
```

### Environment

Create a `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
CONVEX_DEPLOYMENT=dev:<your-deployment>
```

The Convex variables are auto-generated when you run `npx convex dev` for the first time.

### Run

In one terminal:
```bash
npx convex dev
```

In another:
```bash
npm run dev
```

Open **http://localhost:3000**

---

## How It Works

```
┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│  Your prompt │ ─▶ │  Gemini 2.5      │ ─▶ │  Multi-file  │
│              │    │  Flash (JSON)    │    │  React app   │
└──────────────┘    └──────────────────┘    └──────────────┘
                                                    │
                                                    ▼
                                         ┌────────────────────┐
                                         │  Sandpack preview  │
                                         │  + ZIP export      │
                                         └────────────────────┘
```

1. Enter a prompt — *"A modern SaaS landing page with pricing tiers"*
2. (Optional) Click **Enhance** to expand it into a detailed spec
3. Hit **Generate** — Gemini returns a structured JSON of files
4. Live preview renders in Sandpack; chat to iterate; export when done

---

## Project Structure

```
ai-web-builder/
├── app/
│   ├── (main)/workspace/[id]/   # Workspace page (chat + code)
│   ├── api/
│   │   ├── ai-chat/             # Conversational chat
│   │   ├── enhance-prompt/      # Prompt enhancement
│   │   └── gen-ai-code/         # Code generation
│   ├── icon.png                 # Favicon
│   ├── layout.js
│   └── page.js                  # Home (Hero + Footer)
│
├── components/
│   ├── custom/                  # Hero, Header, Footer, ChatView,
│   │                            # CodeView, ChatHistory
│   └── ui/                      # Reusable primitives
│
├── configs/
│   └── AiModel.jsx              # Gemini client + model configs
│
├── context/
│   └── MessagesContext.jsx
│
├── convex/
│   ├── schema.js                # workspace + users tables
│   └── workspace.js             # CRUD mutations / queries
│
├── data/
│   ├── Lookup.jsx               # Suggestions, default files, deps
│   └── Prompt.jsx               # System prompts (whitelist of imports)
│
└── lib/
    ├── chatHistory.js           # localStorage history helpers
    └── utils.js
```

---

## Customization

### Swap AI Providers

Both `chatConfig`, `codeGenConfig`, and `enhancePromptConfig` live in [`configs/AiModel.jsx`](configs/AiModel.jsx). The OpenAI SDK is used as a thin client — swapping providers is a baseURL + key change:

```js
// Gemini (current)
new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

// Groq (alternative)
new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// OpenAI
new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

### Tune Output Style

[`data/Prompt.jsx`](data/Prompt.jsx) contains the system prompts. Edit `CODE_GEN_PROMPT` to:
- Change visual style (gradients, themes, density)
- Switch frameworks (Vue, Svelte, etc.)
- Adjust the dependency whitelist

### Allowed Dependencies

The Sandpack runtime only has the packages listed in `Lookup.DEPENDANCY` ([data/Lookup.jsx](data/Lookup.jsx)). The system prompt mirrors this list as a strict import whitelist to prevent the AI from hallucinating packages.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| **Framework** | Next.js 15 (App Router) |
| **UI** | React 18, Tailwind CSS |
| **AI** | Google Gemini 2.5 Flash (via OpenAI-compatible endpoint) |
| **Backend** | Convex (real-time DB + functions) |
| **Live Preview** | CodeSandbox Sandpack |
| **Icons** | Lucide React |
| **Hosting** | Vercel |

---

## Deployment

### Vercel + Convex

```bash
# 1. Deploy Convex to production
npx convex deploy

# 2. Push to GitHub, then import to Vercel:
#    https://vercel.com/new
```

**Environment variables** to set in Vercel:

| Key | Value |
|-----|-------|
| `GEMINI_API_KEY` | Your Gemini API key |
| `NEXT_PUBLIC_CONVEX_URL` | Production URL from `npx convex deploy` |
| `CONVEX_DEPLOY_KEY` | From Convex dashboard → Settings → Deploy Keys |

**Build command override:**
```
npx convex deploy --cmd 'npm run build'
```

This ensures Convex schema/functions sync on every deploy.

---

## Contributing

1. Fork the repo
2. Create a branch (`git checkout -b feature/your-feature`)
3. Commit and push
4. Open a PR

Ideas welcome: more AI providers, starter templates, prompt improvements, export to StackBlitz/CodeSandbox.

---

## License

MIT — use it however you want, including commercially.

---

<div align="center">

Developed by **[Ansar Ali](https://github.com/ansarali41)**

</div>
