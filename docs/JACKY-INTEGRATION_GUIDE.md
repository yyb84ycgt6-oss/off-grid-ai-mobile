# Free AI + eYe Pods Integration for Jackie (Lovable Project)

## Overview
Add Free AI multi-provider chat and eYe encryption to the Jackie Lovable web app. Lovable provides visual editing, so integration focuses on React components and Supabase backend setup.

## Step 1: Backend—copy Free AI library into Supabase Edge Functions
```bash
# Copy to Supabase functions
mkdir -p supabase/functions/free-ai
cp ../Cybernetic-PC-merged.bundle/lib/freeAI/*.ts supabase/functions/free-ai/
cp ../Cybernetic-PC-merged.bundle/lib/pods/*.ts supabase/functions/free-ai/
```

## Step 2: Create Supabase Edge Function for Free AI
Create `supabase/functions/free-ai/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { FreeAIRouter } from "./router.ts";

const freeAIRouter = new FreeAIRouter();

serve(async (req) => {
  const { pathname } = new URL(req.url);

  if (pathname === "/free-ai/chat" && req.method === "POST") {
    const { messages, model, temperature, maxTokens, stream, provider } = await req.json();
    
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages[] required" }), { status: 400 });
    }

    if (stream) {
      const encoder = new TextEncoder();
      const chunks = [];
      for await (const chunk of freeAIRouter.chatStream({ messages, model, temperature, maxTokens, provider })) {
        chunks.push(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      chunks.push("data: [DONE]\n\n");
      
      return new Response(chunks.join(""), {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    const result = await freeAIRouter.chat({ messages, model, temperature, maxTokens, provider });
    return new Response(JSON.stringify(result), { status: 200 });
  }

  if (pathname === "/free-ai/health" && req.method === "GET") {
    const providers = await freeAIRouter.health();
    return new Response(JSON.stringify({ providers }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
});
```

## Step 3: Set environment variables
In Supabase project dashboard, add:
```
GROQ_API_KEY=your_key
OPENROUTER_API_KEY=your_key
OPENROUTER_REFERER=https://your-lovable-project.lovable.app
OLLAMA_ENDPOINT=http://127.0.0.1:11434
OLLAMA_MODEL=llama2
```

## Step 4: Create React component for Free AI chat
In Lovable visual editor, create component or add to `src/components/FreeAIChat.tsx`:

```typescript
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function FreeAIChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState('');
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const { data } = await supabase.functions.invoke('free-ai', {
        body: { action: 'health' },
      });
      const allModels = data.providers
        .flatMap((p: any) => p.models || [])
        .map((m: string) => ({ label: m, value: m }));
      setModels(allModels);
    } catch (err) {
      console.error('Failed to fetch models:', err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !model) return;

    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const { data: response } = await supabase.functions.invoke('free-ai', {
        body: {
          action: 'chat',
          messages: newMessages,
          model,
          stream: true,
        },
      });

      let fullResponse = '';
      for await (const line of response.split('\n')) {
        if (line.startsWith('data: ')) {
          const chunk = JSON.parse(line.slice(6));
          if (chunk.token) fullResponse += chunk.token;
          if (chunk.done) break;
        }
      }

      setMessages([...newMessages, { role: 'assistant', content: fullResponse }]);
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">
      <select
        value={model}
        onChange={(e) => setModel(e.target.value)}
        className="border rounded p-2"
      >
        <option value="">Select model</option>
        {models.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      <div className="border rounded p-4 h-96 overflow-y-auto bg-gray-50">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-2 ${msg.role === 'user' ? 'text-right' : ''}`}>
            <span className={`inline-block p-2 rounded ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
              {msg.content}
            </span>
          </div>
        ))}
        {loading && <div className="text-gray-500">Thinking...</div>}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 border rounded p-2"
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}
```

## Step 5: Add eYe Pod storage (optional)
Store encrypted conversations in Supabase:

```typescript
import { sealPod, openPod } from '@/lib/pods/eyePod';

async function saveEncryptedConversation(conversation: any, userSecret: string) {
  const pod = await sealPod(JSON.stringify(conversation), userSecret);
  const { data, error } = await supabase
    .from('encrypted_conversations')
    .insert([
      {
        user_id: (await supabase.auth.getUser()).data.user?.id,
        pod_bytes: pod.bytes,
        created_at: new Date().toISOString(),
      },
    ]);
  return data;
}

async function loadEncryptedConversation(podBytes: Uint8Array, userSecret: string) {
  const decrypted = await openPod(podBytes, userSecret);
  return JSON.parse(new TextDecoder().decode(decrypted));
}
```

## Step 6: Database schema (if storing encrypted chats)
Create migration in `supabase/migrations/`:

```sql
CREATE TABLE encrypted_conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  pod_bytes BYTEA NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE encrypted_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own encrypted chats"
  ON encrypted_conversations
  FOR SELECT
  USING (auth.uid() = user_id);
```

## Testing
```bash
npm run dev
# Navigate to Free AI Chat component
# Select a model
# Send a message
# Should get SSE streaming response from Groq/OpenRouter/Ollama
```

## Deployment
```bash
# Deploy Edge Functions
supabase functions deploy free-ai

# Push code changes
git add supabase/functions/free-ai src/components/FreeAIChat.tsx .env
git commit -m "feat: Add Free AI multi-provider + eYe encryption"
git push origin main
```

Lovable will auto-sync the changes.
