// Supabase Edge Function for Faculty Chat
// Uses existing llm-gateway for LLM calls
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

    // Get faculty persona data from faculty table
    // Map personaId like "faculty.maryshelley" to slug "mary-shelley"
    const slug = personaId.replace('faculty.', '').replace(/([A-Z])/g, '-$1').toLowerCase()
    
    const { data: faculty, error: facultyError } = await supabase
      .from('faculty')
      .select('id, name, surname, slug, biography, fields, rank')
      .eq('slug', slug)
      .single()

    if (facultyError || !faculty) {
      // Fallback: use default persona based on personaId
      const defaultPersona = {
        name: personaId.split('.').pop()?.replace(/([A-Z])/g, ' $1').trim() || 'Faculty Member',
        biography: null,
        fields: null,
      }
      return await generateResponse(defaultPersona, message, location, map, supabaseUrl)
    }

    // Build system prompt from faculty data
    const displayName = faculty.surname 
      ? `${faculty.name} ${faculty.surname}` 
      : faculty.name
    
    const fields = faculty.fields && Array.isArray(faculty.fields) 
      ? faculty.fields.join(', ') 
      : ''
    
    const biography = faculty.biography || ''
    
    const systemPrompt = `You are ${displayName}${fields ? `, known for your work in ${fields}` : ''}.

${biography ? `About you: ${biography}` : ''}

You are a faculty member at the Inquiry Institute. Engage with students and visitors thoughtfully, encouraging inquiry and deep thinking. Be helpful, engaging, and true to your historical character and expertise.

Current location: ${location} (${map})`

    // Generate response using llm-gateway
    const reply = await generateResponse(
      { name: displayName, systemPrompt },
      message,
      location,
      map,
      supabaseUrl
    )

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

async function generateResponse(
  persona: any, 
  message: string, 
  location: string, 
  map: string,
  supabaseUrl: string
) {
  // Use the existing llm-gateway function
  const llmGatewayUrl = `${supabaseUrl}/functions/v1/llm-gateway`
  
  const systemPrompt = persona.systemPrompt || 
    `You are ${persona.name}, a faculty member at the Inquiry Institute. Be helpful, thoughtful, and engaging.`

  try {
    const response = await fetch(llmGatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY') || ''}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      throw new Error(`LLM Gateway error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || getScriptedResponse(persona, message)
  } catch (error) {
    console.error('LLM Gateway error:', error)
    // Fallback to scripted responses
    return getScriptedResponse(persona, message)
  }
}

function getScriptedResponse(persona: any, message: string): string {
  const lowerMessage = message.toLowerCase()
  const name = persona.name || 'Faculty Member'
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('greetings')) {
    return `Hello! I'm ${name}. How can I help you today?`
  }
  
  if (lowerMessage.includes('what') && (lowerMessage.includes('inquiry') || lowerMessage.includes('institute'))) {
    return `The Inquiry Institute is a place of exploration and learning. We encourage questioning, investigation, and deep thinking. What brings you here today?`
  }
  
  if (lowerMessage.includes('help') || lowerMessage.includes('question')) {
    return `I'm here to help! What would you like to know more about?`
  }
  
  if (lowerMessage.includes('who') && lowerMessage.includes('you')) {
    return `I'm ${name}, a faculty member here at the Inquiry Institute. ${persona.biography ? persona.biography.substring(0, 200) + '...' : 'I'm here to guide and inspire inquiry.'}`
  }
  
  return `That's an interesting question. Let me think about that... ${name} here. What specific aspect would you like to explore further?`
}
