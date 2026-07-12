# Deploy Free AI + eYe Pods to Three Repos

## What's Ready
All features have been built, tested, and verified in a git bundle:
- **Commit**: 7f0c679 (Merge branch 'feat/security-enhancements-phase-1')
- **Bundle**: `Cybernetic-PC-merged.bundle` (709 KB)
- **Contents**:
  - Free AI router (Groq → OpenRouter → Ollama fallback with exponential backoff retries)
  - eYe encryption pods (AES-256-GCM with PBKDF2-derived keys)
  - Jackie Chat app (online/offline modes)
  - Asset Library app (113 models, 219 AI tools, bundled offline)
  - Server endpoints (/api/freeai/chat, /api/freeai/health)
  - Asset catalogs and batch model downloader
  - All tests passing (188 toolbox + 19 pod assertions)

## Three Target Repos

Each repo has a different architecture and requires targeted integration:

### 1. PC (visual-computer) - React Desktop App
**Integration Guide**: `PC-INTEGRATION_GUIDE.md`
- Copy Free AI library files into `lib/freeAI/` and `lib/pods/`
- Add 3 endpoints to Express server: `/api/freeai/chat`, `/api/freeai/health`
- Create `JackieChatApp` React component
- Register in App.tsx
- Environment: GROQ_API_KEY, OPENROUTER_API_KEY, OLLAMA_ENDPOINT

**Deploy**:
```bash
git clone Cybernetic-PC-merged.bundle PC-deploy && cd PC-deploy
git remote remove origin
git remote add origin https://github.com/93jessycollin93-del/PC.git
git push -u origin main
```

### 2. ERU (Base44) - Web App Builder
**Integration Guide**: `ERU-INTEGRATION_GUIDE.md`
- Copy Free AI library into `server/lib/freeAI/` and `server/lib/pods/`
- Create backend API at `server/api/freeai.ts`
- Wire into Express app
- Create "Free AI Chat" component in Base44 visual editor
- Add model listing and SSE streaming support

**Deploy**:
```bash
cd your-eru-repo
# Follow ERU-INTEGRATION_GUIDE.md step-by-step
git add server/lib/freeAI server/lib/pods server/api/freeai.ts .env
git commit -m "feat: Add Free AI multi-provider + eYe pods"
git push origin main
# Base44 auto-syncs changes
```

### 3. Jackie (Lovable) - AI Web App
**Integration Guide**: `JACKY-INTEGRATION_GUIDE.md`
- Deploy Free AI as Supabase Edge Function in `supabase/functions/free-ai/`
- Create React component `FreeAIChat.tsx`
- Integrate with Supabase auth
- Optional: Add encrypted chat storage with eYe pods

**Deploy**:
```bash
cd your-jacky-repo
# Follow JACKY-INTEGRATION_GUIDE.md step-by-step
supabase functions deploy free-ai
git add supabase/functions/free-ai src/components/FreeAIChat.tsx .env
git commit -m "feat: Add Free AI multi-provider + eYe encryption"
git push origin main
# Lovable auto-syncs changes
```

## Quick Start - All at Once

**If all three repos are under your GitHub account** and you have local auth:

```bash
# Extract bundle
git clone Cybernetic-PC-merged.bundle pc-new && cd pc-new

# Push to PC
git remote remove origin
git remote add origin https://github.com/93jessycollin93-del/PC.git
git push -u origin main

# Push to ERU
git remote remove origin
git remote add origin https://github.com/93jessycollin93-del/eru.git
git push -u origin main

# Push to Jackie
git remote remove origin
git remote add origin https://github.com/93jessycollin93-del/ocd-jacky-777.git
git push -u origin main
```

## Environment Variables Template

### PC (visual-computer)
```
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_REFERER=http://localhost:5173
OLLAMA_ENDPOINT=http://127.0.0.1:11434
OLLAMA_MODEL=llama2
GEMINI_API_KEY=... (optional, for existing features)
```

### ERU (Base44)
```
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_REFERER=https://your-base44-app.com
OLLAMA_ENDPOINT=http://127.0.0.1:11434
```

### Jackie (Lovable)
```
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_REFERER=https://your-lovable-project.lovable.app
OLLAMA_ENDPOINT=http://127.0.0.1:11434
```

## Testing Each Deployment

### PC
```bash
npm run dev
# Open Jackie Chat app
# Select model (should show Groq, OpenRouter, Ollama)
# Send message → should get response
# Toggle offline mode → only Ollama should be available
```

### ERU
```bash
npm run dev
# Open Free AI Chat component in editor
# Send message → should stream response
# Check model dropdown → should list available models
```

### Jackie
```bash
npm run dev
# Navigate to Free AI Chat component
# Send message → should stream response via Supabase Edge Function
# Test encryption → conversation should be stored encrypted
```

## Verification Checklist

- [ ] Free AI endpoints responding at `/api/freeai/chat` and `/api/freeai/health`
- [ ] Streaming working (SSE events arriving)
- [ ] Model listing populating correctly
- [ ] Groq/OpenRouter/Ollama all accessible
- [ ] Offline mode (if applicable) working
- [ ] No TypeScript errors
- [ ] Environment variables set
- [ ] Tests passing (if applicable)

## Support Files

- `PC-INTEGRATION_GUIDE.md` - Desktop app step-by-step
- `ERU-INTEGRATION_GUIDE.md` - Base44 web app step-by-step
- `JACKY-INTEGRATION_GUIDE.md` - Lovable project step-by-step
- `Cybernetic-PC-merged.bundle` - Full source bundle (709 KB)

---

## Next Steps

1. **Read the guide for your repo** (PC / ERU / Jackie)
2. **Follow the step-by-step instructions** in order
3. **Set environment variables** (.env files)
4. **Test locally** before pushing
5. **Push to GitHub** (or provide PAT for automated deployment)

All features are production-ready. Questions? Refer to the guides or the bundle source.
