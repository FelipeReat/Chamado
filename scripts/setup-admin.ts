import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('your-project') || serviceRoleKey.includes('your-service-role-key')) {
    console.error('Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configurados no .env')
    console.error('Atualize o .env com os valores reais do seu projeto Supabase e rode novamente.')
    process.exit(1)
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@empresa.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123!'

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  console.log('Criando usuário administrador padrão...')
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      full_name: 'Administrador',
      role: 'admin',
    },
  })

  if (createError) {
    console.error('Falha ao criar usuário admin:', createError.message)
    process.exit(1)
  }

  const userId = created.user?.id
  if (!userId) {
    console.error('Falha: ID do usuário não retornado.')
    process.exit(1)
  }

  console.log('Registrando usuário na tabela users...')
  const { error: insertError } = await supabase
    .from('users')
    .insert([
      {
        id: userId,
        email: adminEmail,
        user_metadata: {
          full_name: 'Administrador',
          role: 'admin',
        },
        role: 'admin',
      },
    ])

  if (insertError) {
    console.error('Falha ao inserir na tabela users:', insertError.message)
    process.exit(1)
  }

  console.log('Usuário administrador criado com sucesso!')
  console.log('Credenciais:')
  console.log(` - Email: ${adminEmail}`)
  console.log(` - Senha: ${adminPassword}`)
  console.log('Você pode alterá-las no painel de Gestão de Usuários /usuarios.')
}

main().catch((err) => {
  console.error('Erro inesperado:', err)
  process.exit(1)
})