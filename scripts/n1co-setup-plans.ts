/**
 * n1co Plan Setup Script
 *
 * Creates the 3 Zyncrox subscription plans in N1CO and prints the plan IDs.
 * Run ONCE after receiving credentials from N1CO.
 *
 * Usage:
 *   N1CO_CLIENT_ID=xxx N1CO_CLIENT_SECRET=yyy npx tsx scripts/n1co-setup-plans.ts
 *
 * After running, copy the plan IDs into your platform_config row in the DB:
 *   n1co_plan_id_basic, n1co_plan_id_professional, n1co_plan_id_enterprise
 */

const BASE_URL      = process.env.N1CO_BASE_URL      ?? 'https://api-sandbox.n1co.shop'
const CLIENT_ID     = process.env.N1CO_CLIENT_ID     ?? ''
const CLIENT_SECRET = process.env.N1CO_CLIENT_SECRET ?? ''
const LOCATION_ID   = 19735   // Sucursal ZYNCROX

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌  Set N1CO_CLIENT_ID and N1CO_CLIENT_SECRET env vars before running.')
  process.exit(1)
}

// ---------------------------------------------------------------------------

async function getToken(): Promise<string> {
  const res  = await fetch(`${BASE_URL}/api/v3/Token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET }),
  })
  const data = await res.json() as Record<string, unknown>
  if (!res.ok) throw new Error(`Auth failed ${res.status}: ${JSON.stringify(data)}`)
  const token = (data.token ?? data.access_token ?? data.accessToken) as string
  if (!token) throw new Error(`No token in response: ${JSON.stringify(data)}`)
  return token
}

async function createPlan(token: string, plan: {
  name: string
  description: string
  amount: number
}): Promise<number> {
  const res = await fetch(`${BASE_URL}/api/v3/Plans`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      name:                              plan.name,
      description:                       plan.description,
      amount:                            plan.amount,
      billingCycleType:                  'Month',
      billingCyclesNumber:               1,
      cyclesToBillBeforeAllowCancelation: null,
      termsAndConditions:                'Cobro mensual recurrente. Puedes cancelar en cualquier momento.',
      subscriberLimit:                   null,
      enrollmentEndDate:                 null,
      subscriptionEndDate:               null,
      billingDay:                        null,
      locationId:                        LOCATION_ID,
      customFields:                      [],
    }),
  })

  const text = await res.text()
  let data: Record<string, unknown>
  try { data = JSON.parse(text) } catch { data = { raw: text } }

  if (!res.ok) throw new Error(`createPlan "${plan.name}" failed ${res.status}: ${JSON.stringify(data)}`)

  const planId = (data.planId ?? data.id) as number
  if (!planId) throw new Error(`No planId in response: ${JSON.stringify(data)}`)
  return planId
}

// ---------------------------------------------------------------------------

const PLANS = [
  { key: 'BASIC',        name: 'Zyncrox Basic',        description: 'Plan básico mensual - hasta 3 empleados',          amount: 25 },
  { key: 'PROFESSIONAL', name: 'Zyncrox Professional',  description: 'Plan profesional mensual - hasta 10 empleados',    amount: 59 },
  { key: 'ENTERPRISE',   name: 'Zyncrox Business',      description: 'Plan business mensual - empleados ilimitados',     amount: 99 },
]

async function main() {
  console.log(`\n🔐  Authenticating with N1CO (${BASE_URL})...`)
  const token = await getToken()
  console.log('✅  Token obtained\n')

  const results: Record<string, number> = {}

  for (const plan of PLANS) {
    process.stdout.write(`📋  Creating plan "${plan.name}" ($${plan.amount}/mes)... `)
    const planId = await createPlan(token, plan)
    results[plan.key] = planId
    console.log(`✅  planId = ${planId}`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅  All plans created. Save these IDs in platform_config:\n')
  console.log(`  n1co_plan_id_basic        = ${results.BASIC}`)
  console.log(`  n1co_plan_id_professional = ${results.PROFESSIONAL}`)
  console.log(`  n1co_plan_id_enterprise   = ${results.ENTERPRISE}`)
  console.log('\nSQL:')
  console.log(`UPDATE platform_config SET`)
  console.log(`  n1co_plan_id_basic        = '${results.BASIC}',`)
  console.log(`  n1co_plan_id_professional = '${results.PROFESSIONAL}',`)
  console.log(`  n1co_plan_id_enterprise   = '${results.ENTERPRISE}'`)
  console.log(`WHERE id = (SELECT id FROM platform_config LIMIT 1);`)
  console.log('='.repeat(60) + '\n')
}

main().catch(err => {
  console.error('\n❌ ', err.message)
  process.exit(1)
})
