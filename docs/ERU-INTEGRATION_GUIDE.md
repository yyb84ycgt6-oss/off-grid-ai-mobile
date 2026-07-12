# Free AI + eYe Pods Integration for ERU (Base44)

## Overview
Add Free AI chat backend and eYe encryption to the ERU Base44 web app. Base44 provides visual editing, so integration focuses on backend server setup and API layer.

## Step 1: Backend setup—copy Free AI library
```bash
mkdir -p server/lib/freeAI server/lib/pods
cp ../Cybernetic-PC-merged.bundle/lib/freeAI/*.ts server/lib/freeAI/
cp ../Cybernetic-PC-merged.bundle/lib/pods/*.ts server/lib/pods/
```

## Step 2: Create/update server API
Create `server/api/freeai.ts` or add to your existing Express server:

```typescript
import express from 'express';
import { freeAIRouter } from '../lib/freeAI/router';

export const freeaiRouter = express.Router();

freeaiRouter.post('/chat', async (req, res) => {
  const { messages, model, temperature, maxTokens, stream, provider } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages[] is required' });
  }

  try {
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of freeAIRouter.chatStream({ messages, model, temperature, maxTokens, provider })) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        if (chunk.done) break;
      }
      res.write('data: [DONE]\n\n');
      return res.end();
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

freeaiRouter.get('/health', async (req, res) => {
  try {
    const providers = await freeAIRouter.health();
    res.json({ providers });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
```

## Step 3: Wire into main server
In your Express app entry point:
```typescript
import { freeaiRouter } from './api/freeai';
app.use('/api/freeai', freeaiRouter);
```

## Step 4: Update .env
```
GROQ_API_KEY=your_key
OPENROUTER_API_KEY=your_key
OPENROUTER_REFERER=https://your-base44-app.com
OLLAMA_ENDPOINT=http://127.0.0.1:11434
```

## Step 5: Create Base44 Chat Component
In the Base44 visual editor:
1. Create new component "Free AI Chat"
2. Add form fields: messages (textarea), model (dropdown), temperature (slider)
3. Fetch from `/api/freeai/chat` on submit
4. Render streaming response with SSE event handling:

```javascript
async function* freeAIChatStream(messages, model, provider) {
  const response = await fetch('/api/freeai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model, provider, stream: true }),
  });

  if (!response.body) throw new Error('No response body');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const lines = decoder.decode(value).split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const json = JSON.parse(line.slice(6));
        yield json;
      }
    }
  }
}
```

## Step 6: Add model listing
Fetch `/api/freeai/health` on component mount to populate model dropdown:

```javascript
const resp = await fetch('/api/freeai/health');
const { providers } = await resp.json();
const models = providers
  .flatMap(p => p.models || [])
  .map(m => ({ label: m, value: m }));
```

## Step 7: eYe Pod support (optional)
If you want to encrypt/compress conversations:
```typescript
import { sealPod, openPod } from '../lib/pods/eyePod';

// Before sending to storage
const pod = await sealPod(JSON.stringify(conversation), userSecret);

// Later, retrieve and decrypt
const decrypted = await openPod(pod.bytes, userSecret);
```

## Testing
```bash
npm run dev
# Open Base44 editor
# Create Free AI Chat component
# Deploy to staging
# Test chat: should respond via Groq/OpenRouter/Ollama
```

## Deployment
```bash
git add server/lib/freeAI server/lib/pods server/api/freeai.ts .env
git commit -m "feat: Add Free AI multi-provider backend + eYe pods"
git push origin main
```

Base44 will auto-sync the changes.
