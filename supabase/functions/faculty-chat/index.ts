// Supabase Edge Function for Faculty Chat
// Deploy with: supabase functions deploy faculty-chat

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { personaId, message, location, map } = await req.json()

    if (!personaId || !message) {
      return new Response(
        JSON.stringify({ error: 'personaId and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get faculty persona data
    const { data: persona, error: personaError } = await supabase
      .from('faculty_personas')
      .select('*')
      .eq('persona_id', personaId)
      .single()

    if (personaError || !persona) {
      // Fallback: use default persona
      const defaultPersona = {
        system_prompt: `You are a faculty member at the Inquiry Institute. Be helpful, thoughtful, and engaging.`,
        style: 'conversational',
        name: personaId.split('.').pop() || 'Faculty Member'
      }
      return await generateResponse(defaultPersona, message, location, map)
    }

    // Get RAG context if available
    let ragContext = ''
    if (persona.rag_enabled) {
      const { data: context } = await supabase
        .rpc('match_faculty_documents', {
          query_embedding: await getEmbedding(message),
          match_threshold: 0.7,
          match_count: 5,
          persona_id: personaId
        })
      
      if (context && context.length > 0) {
        ragContext = context.map((c: any) => c.content).join('\n\n')
      }
    }

    // Generate response
    const reply = await generateResponse(persona, message, location, map, ragContext)

    return new Response(
      JSON.stringify({ reply, personaId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function generateResponse(persona: any, message: string, location: string, map: string, ragContext: string = '') {
  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  
  if (!openaiKey) {
    // Fallback to simple scripted responses
    return getScriptedResponse(persona, message)
  }

  const systemPrompt = `${persona.system_prompt || 'You are a helpful faculty member.'}

${ragContext ? `Relevant context:\n${ragContext}\n\nUse this context to inform your response.` : ''}

Current location: ${location} (${map})
Style: ${persona.style || 'conversational'}`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

function getScriptedResponse(persona: any, message: string): string {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return `Hello! How can I help you today?`
  }
  
  if (lowerMessage.includes('what') && lowerMessage.includes('inquiry')) {
    return `The Inquiry Institute is a place of exploration and learning. We encourage questioning, investigation, and deep thinking.`
  }
  
  if (lowerMessage.includes('help')) {
    return `I'm here to help! What would you like to know more about?`
  }
  
  return `That's an interesting question. Let me think about that...`
}

async function getEmbedding(text: string): Promise<number[]> {
  // Placeholder - implement with OpenAI embeddings or Supabase vector
  // For now, return empty array
  return []
}
