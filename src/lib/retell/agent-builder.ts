import { createServiceClient } from '@/lib/supabase/service'
import { retellClient } from './client'
import type { AgentConfig, KnowledgeEntry, BusinessHours, SalesPlaybook } from '@/types/domain'

// Category display order in prompt — most business-critical info first
const CATEGORY_ORDER = [
  'services',
  'pricing',
  'hours',
  'policies',
  'faq',
  'location',
  'team',
  'promotions',
  'competitors',
]

/**
 * Build the AI agent's system prompt from the client's DB record and knowledge base.
 * Called before syncing to Retell API when knowledge base or agent config changes.
 */
export async function buildAgentPrompt(clientId: string): Promise<string> {
  const supabase = createServiceClient()

  const [{ data: client }, { data: knowledge }, { data: playbooks }] = await Promise.all([
    supabase.from('clients').select('*, agent_config(*)').eq('id', clientId).single(),
    supabase
      .from('knowledge_base')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('priority', { ascending: false }),
    supabase
      .from('sales_playbooks')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('priority', { ascending: false }),
  ])

  if (!client) throw new Error(`Client ${clientId} not found`)

  // Fall back to sensible defaults if no agent_config row exists
  const config: AgentConfig = client.agent_config?.[0] ?? {
    id: '',
    client_id: clientId,
    agent_name: 'receptionist',
    greeting: `Thanks for calling ${client.name}, how can I help you?`,
    personality: 'friendly, professional, and helpful',
    sales_style: 'consultative — ask good questions, understand the need, suggest solutions',
    escalation_rules: null,
    voicemail_message: `You've reached ${client.name}. We're currently closed. Please leave your name and phone number and we'll call you back shortly.`,
    voice_id: null,
    language: 'en-US',
    custom_instructions: null,
    created_at: '',
    updated_at: '',
  }

  // Group active knowledge entries by category (already ordered by priority from query)
  const grouped: Record<string, KnowledgeEntry[]> = {}
  for (const entry of (knowledge ?? []) as KnowledgeEntry[]) {
    if (!grouped[entry.category]) grouped[entry.category] = []
    grouped[entry.category].push(entry)
  }

  // Build knowledge sections in defined order
  const knowledgeSections = CATEGORY_ORDER.filter((cat) => grouped[cat]?.length > 0)
    .map((cat) => {
      const entries = grouped[cat]
      const header = `## ${cat.charAt(0).toUpperCase() + cat.slice(1)}`
      const body = entries
        .map((e) => `### ${e.title}\n${e.content}`)
        .join('\n\n')
      return `${header}\n${body}`
    })
    .join('\n\n')

  // Business hours section (omitted if not configured)
  const hoursSection = client.business_hours
    ? formatBusinessHours(client.business_hours as BusinessHours)
    : ''

  // Escalation: use config value or fall back to default
  const escalation =
    config.escalation_rules ??
    "If caller is frustrated, angry, or has a complex complaint, say 'Let me have someone from our team call you right back.'"

  const sections = [
    `You are ${config.agent_name}, the AI receptionist for ${client.name}.`,
    '',
    '## Personality',
    config.personality ?? 'Friendly, professional, and helpful',
    '',
    '## Greeting',
    `Always start the call with: "${config.greeting}"`,
    '',
    knowledgeSections,
    hoursSection,
    '## Your Sales Approach',
    config.sales_style ?? 'Ask good questions. Understand what the caller needs. Suggest solutions.',
    '',
    ...formatPlaybookSection((playbooks ?? []) as SalesPlaybook[]),
    '## Escalation Rules',
    escalation,
    '',
    ...(config.voicemail_message
      ? [
          '## After-Hours Behavior',
          `If a caller reaches you outside business hours, follow this script:`,
          `"${config.voicemail_message}"`,
          `After delivering this message, still try to capture the caller's name, phone number, and what they need.`,
          '',
        ]
      : []),
    '## Core Rules',
    `- Always be helpful, warm, and professional`,
    `- If you don't know something, say "Let me have ${client.owner_name ?? 'someone from our team'} get back to you on that"`,
    `- Always try to get the caller's name and phone number`,
    `- Never make up information — only use what's in your knowledge above`,
    `- If the business is closed and caller asks for an appointment, offer to take their info and have someone call them back`,
    '',
    ...(config.custom_instructions
      ? ['## Additional Instructions', config.custom_instructions, '']
      : []),
    '## Information to Capture on Every Call',
    `- Caller's name`,
    `- Best callback number`,
    `- What they need (service, question, complaint)`,
    `- Urgency — when do they need this done?`,
  ]

  return sections.filter((s) => s !== null && s !== undefined).join('\n').trim()
}

/**
 * Create a new Retell LLM + Agent + Phone Number for a freshly onboarded client.
 * Expects the client, agent_config, and knowledge_base rows to already exist in DB.
 * Updates the client record with the resulting retell_agent_id and phone_number.
 */
export async function createRetellAgent(
  clientId: string,
  voiceId: string,
  areaCode?: number,
): Promise<{ agentId: string; phoneNumber: string }> {
  const supabase = createServiceClient()

  // 1. Build system prompt from existing DB data
  const systemPrompt = await buildAgentPrompt(clientId)

  // 2. Create Retell LLM with the prompt
  const llm = await retellClient.llm.create({
    model: 'claude-4.5-haiku',
    general_prompt: systemPrompt,
  })

  // 3. Create Retell Agent bound to the LLM
  const agent = await retellClient.agent.create({
    response_engine: { type: 'retell-llm', llm_id: llm.llm_id },
    voice_id: voiceId,
    agent_name: `client-${clientId}`,
  })

  // 4. Purchase phone number and bind to agent
  const phone = await retellClient.phoneNumber.create({
    ...(areaCode ? { area_code: areaCode } : {}),
    inbound_agents: [{ agent_id: agent.agent_id, weight: 1 }],
    nickname: `client-${clientId}`,
  })

  // 5. Update client record with Retell IDs
  await supabase
    .from('clients')
    .update({
      retell_agent_id: agent.agent_id,
      phone_number: phone.phone_number,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  return { agentId: agent.agent_id, phoneNumber: phone.phone_number }
}

const PLAYBOOK_CATEGORY_LABELS: Record<string, string> = {
  objection_handling: 'Objection Handling',
  upsell_trigger: 'Upsell Opportunities',
  urgency_script: 'Creating Urgency',
  closing_technique: 'Closing Techniques',
}

function formatPlaybookSection(playbooks: SalesPlaybook[]): string[] {
  if (playbooks.length === 0) return []

  const grouped: Record<string, SalesPlaybook[]> = {}
  for (const p of playbooks) {
    if (!grouped[p.category]) grouped[p.category] = []
    grouped[p.category].push(p)
  }

  const lines: string[] = ['## Sales Playbook']

  for (const [category, entries] of Object.entries(grouped)) {
    const label = PLAYBOOK_CATEGORY_LABELS[category] ?? category
    lines.push(`### ${label}`)
    for (const entry of entries) {
      if (entry.trigger_phrase) {
        lines.push(`- When caller says "${entry.trigger_phrase}": ${entry.response_script}`)
      } else {
        lines.push(`- ${entry.title}: ${entry.response_script}`)
      }
    }
  }

  lines.push('')
  return lines
}

function formatBusinessHours(hours: BusinessHours): string {
  const days: Array<[keyof BusinessHours, string]> = [
    ['monday', 'Monday'],
    ['tuesday', 'Tuesday'],
    ['wednesday', 'Wednesday'],
    ['thursday', 'Thursday'],
    ['friday', 'Friday'],
    ['saturday', 'Saturday'],
    ['sunday', 'Sunday'],
  ]

  const lines = days.map(([key, label]) => {
    const h = hours[key]
    if (!h || h.closed || !h.open || !h.close) return `${label}: Closed`
    return `${label}: ${h.open} - ${h.close}`
  })

  return `## Business Hours\n${lines.join('\n')}\n`
}

/**
 * Sync the rebuilt agent prompt to the Retell API.
 * Fetches the Retell LLM ID from the agent, then pushes the new system prompt via llm.update.
 * No-op if the client has no retell_agent_id configured.
 */
export async function updateRetellAgent(clientId: string): Promise<void> {
  const supabase = createServiceClient()
  const { data: client } = await supabase
    .from('clients')
    .select('retell_agent_id, agent_config(*)')
    .eq('id', clientId)
    .single()

  if (!client?.retell_agent_id) {
    console.warn(`Client ${clientId} has no retell_agent_id — skipping agent sync`)
    return
  }

  // Build the latest system prompt
  const systemPrompt = await buildAgentPrompt(clientId)

  // Retrieve the agent to find which LLM it's using
  const agent = await retellClient.agent.retrieve(client.retell_agent_id)

  if (agent.response_engine?.type === 'retell-llm') {
    const llmId = (agent.response_engine as { type: string; llm_id: string }).llm_id
    await retellClient.llm.update(llmId, { general_prompt: systemPrompt })
  } else {
    console.warn(
      `Client ${clientId} agent uses response_engine type "${agent.response_engine?.type}" — only "retell-llm" supports prompt sync`
    )
  }
}
