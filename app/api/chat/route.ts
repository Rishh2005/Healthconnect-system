import { generateText } from 'ai'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const model = 'google/gemini-3.8-flash'
const baseInstructions = `You are HealthConnect's health information guide, not a clinician. Give concise, plain-language general information only. Never diagnose, prescribe, recommend starting/stopping medication, or claim certainty. Be honest about uncertainty, ask the user to discuss personal decisions with a licensed clinician, and do not claim to have reviewed records that were not supplied. If a user describes a possible emergency (including severe chest pain, trouble breathing, stroke signs, uncontrolled bleeding, loss of consciousness, or imminent self-harm), tell them to call their local emergency number or go to emergency care now; do not delay with questions or routine advice. Do not use tools or take action on the user's behalf.`

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in to use the health guide.' }, { status: 401 })

  try {
    const body = await request.json()
    const kind = body?.kind === 'symptom' ? 'symptom' : 'guide'
    if (!Array.isArray(body?.messages) || body.messages.length < 1 || body.messages.length > 12) {
      return NextResponse.json({ error: 'Please send a shorter conversation.' }, { status: 400 })
    }

    const rawMessages: unknown[] = body.messages
    const messages = rawMessages.filter((message): message is { role: 'user' | 'assistant'; content: string } => {
      if (!message || typeof message !== 'object') return false
      const item = message as Record<string, unknown>
      return (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string' && item.content.length > 0 && item.content.length <= 1200
    })
    if (!messages.length || messages.length !== body.messages.length) return NextResponse.json({ error: 'Some messages were invalid or too long.' }, { status: 400 })

    const instructions = kind === 'symptom'
      ? `${baseInstructions} For symptom entries, do not triage beyond conservative safety guidance. Explain that severity ratings are subjective, encourage timely professional advice for worsening/new symptoms, and call out emergency warning signs. Never infer a condition from the entry.`
      : baseInstructions
    const prompt = messages.map(message => `${message.role === 'user' ? 'User' : 'Guide'}: ${message.content}`).join('\n\n')
    const { text } = await generateText({ model, instructions, prompt, maxOutputTokens: 500 })
    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({ error: 'The health guide is temporarily unavailable. Your saved health records are not affected.' }, { status: 503 })
  }
}
