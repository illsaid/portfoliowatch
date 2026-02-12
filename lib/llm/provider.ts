export type LLMProvider = 'openai' | 'gemini';

export interface LLMRequest {
  provider: LLMProvider;
  model: string;
  system: string;
  user: string;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

export function getDefaultProvider(): LLMProvider {
  const env = process.env.LLM_PROVIDER?.toLowerCase();
  if (env === 'gemini') return 'gemini';
  return 'openai';
}

export function getDefaultModel(provider: LLMProvider): string {
  const envModel = process.env.LLM_MODEL;
  if (envModel) return envModel;
  return provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini';
}

export function isLLMConfigured(): boolean {
  const provider = getDefaultProvider();
  if (provider === 'openai') {
    return !!process.env.OPENAI_API_KEY;
  }
  return !!process.env.GEMINI_API_KEY;
}

async function callOpenAI(req: LLMRequest): Promise<LLMResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: req.model,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.user },
      ],
      temperature: req.temperature ?? 0.2,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  const usage = data.usage
    ? { prompt_tokens: data.usage.prompt_tokens, completion_tokens: data.usage.completion_tokens }
    : undefined;

  return { content, usage };
}

async function callGemini(req: LLMRequest): Promise<LLMResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${req.model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: `${req.system}\n\n${req.user}` }],
        },
      ],
      generationConfig: {
        temperature: req.temperature ?? 0.2,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const usage = data.usageMetadata
    ? {
        prompt_tokens: data.usageMetadata.promptTokenCount ?? 0,
        completion_tokens: data.usageMetadata.candidatesTokenCount ?? 0,
      }
    : undefined;

  return { content, usage };
}

export async function generateJSON(req: LLMRequest): Promise<unknown> {
  const response = req.provider === 'gemini' ? await callGemini(req) : await callOpenAI(req);

  try {
    return JSON.parse(response.content);
  } catch {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error('Failed to parse LLM response as JSON after repair attempt');
      }
    }
    throw new Error('LLM response is not valid JSON');
  }
}
