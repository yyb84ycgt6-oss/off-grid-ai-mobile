# Free AI + eYe Pods Integration for PC (visual-computer)

## Overview
Add Free AI multi-provider chat (Groq → OpenRouter → Ollama) and eYe encryption pods to the PC desktop app.

## Step 1: Copy Free AI provider library
```bash
mkdir -p lib/freeAI lib/pods
cp ../Cybernetic-PC-merged.bundle/lib/freeAI/*.ts lib/freeAI/
cp ../Cybernetic-PC-merged.bundle/lib/pods/*.ts lib/pods/
cp ../Cybernetic-PC-merged.bundle/scripts/download_models.py scripts/
cp ../Cybernetic-PC-merged.bundle/public/assets/model_list.txt public/assets/
cp ../Cybernetic-PC-merged.bundle/public/assets/ai-tools-directory.json public/assets/
```

## Step 2: Update server.ts
Add these endpoints to your existing Express server:

```typescript
// At the top, add imports
import { freeAIRouter } from './lib/freeAI/router';

// Add routes before app.listen()
app.post('/api/freeai/chat', async (req, res) => {
  const { messages, model, temperature, maxTokens, stream, provider } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'messages[] is required' });
    return;
  }
  try {
    if (stream) {
      res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.flushHeaders?.();
      for await (const chunk of freeAIRouter.chatStream({ messages, model, temperature, maxTokens, provider })) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        if (chunk.done) break;
      }
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }
    const result = await freeAIRouter.chat({ messages, model, temperature, maxTokens, provider });
    res.json(result);
  } catch (err) {
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: String(err) })}\n\n`);
      res.end();
    } else {
      res.status(502).json({ error: String(err) });
    }
  }
});

app.get('/api/freeai/health', async (_req, res) => {
  try {
    res.json({ providers: await freeAIRouter.health() });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
```

## Step 3: Update .env
```
GROQ_API_KEY=your_key_here
OPENROUTER_API_KEY=your_key_here
OPENROUTER_REFERER=http://localhost:5173
OLLAMA_ENDPOINT=http://127.0.0.1:11434
OLLAMA_MODEL=llama2
```

## Step 4: Create JackieChatApp component
Create `components/apps/JackieChatApp.tsx`:
```typescript
// Copy from bundle and adjust component structure to match your PC app
// Key changes: remove Desktop-specific desktop bits, keep React core
```

## Step 5: Wire into App.tsx
```typescript
import JackieChatApp from './components/apps/JackieChatApp';

// In your app registration:
{
  id: 'jackie_chat',
  name: 'Jackie Chat',
  component: JackieChatApp,
  // ... other props
}
```

## Step 6: Install dependencies
```bash
npm install @google/genai fflate
```

## Testing
```bash
npm run dev
# Navigate to Jackie Chat app
# Test: Online mode → select model → send message → should get response from Groq/OpenRouter/Ollama
# Test: Offline mode → select Ollama model → verify only Ollama endpoint is used
```

## Deployment
```bash
git add lib/ public/assets/ scripts/ server.ts .env
git commit -m "feat: Add Free AI multi-provider + eYe pods"
git push origin main
```
