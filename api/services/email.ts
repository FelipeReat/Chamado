import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export interface EmailData {
  to: string
  subject: string
  text?: string
  html?: string
}

export interface TicketEmailData {
  ticketId: string
  title: string
  description: string
  status: string
  priority: string
  category: string
  requesterName: string
  requesterEmail: string
  assignedToName?: string
  assignedToEmail?: string
}

export async function sendEmail(data: EmailData): Promise<void> {
  try {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: data.to,
      subject: data.subject,
      text: data.text,
      html: data.html,
    }

    await transporter.sendMail(mailOptions)
    console.log(`Email sent successfully to ${data.to}`)
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

export async function sendTicketCreatedNotification(data: TicketEmailData): Promise<void> {
  const subject = `Novo Chamado Criado: ${data.title}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #3B82F6; color: white; padding: 20px; text-align: center;">
        <h2>Novo Chamado de Suporte</h2>
      </div>
      <div style="padding: 20px; background-color: #f9f9f9;">
        <p><strong>Olá ${data.assignedToName || 'Equipe de Suporte'},</strong></p>
        <p>Um novo chamado foi criado e requer sua atenção:</p>
        
        <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="color: #333; margin-top: 0;">${data.title}</h3>
          <p><strong>ID:</strong> #${data.ticketId}</p>
          <p><strong>Prioridade:</strong> ${getPriorityLabel(data.priority)}</p>
          <p><strong>Categoria:</strong> ${data.category}</p>
          <p><strong>Status:</strong> ${getStatusLabel(data.status)}</p>
          <p><strong>Solicitante:</strong> ${data.requesterName} (${data.requesterEmail})</p>
          <p><strong>Descrição:</strong></p>
          <p style="background-color: #f5f5f5; padding: 10px; border-radius: 3px;">${data.description}</p>
        </div>
        
        <p>Por favor, acesse o sistema para visualizar e atender este chamado.</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL}/tickets/${data.ticketId}" 
             style="background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Ver Chamado
          </a>
        </div>
        
        <p style="color: #666; font-size: 12px;">
          Este é um email automático. Por favor, não responda a este email.
        </p>
      </div>
    </div>
  `

  await sendEmail({
    to: data.assignedToEmail || process.env.ADMIN_EMAIL || '',
    subject,
    html,
  })
}

export async function sendTicketUpdatedNotification(data: TicketEmailData & { 
  previousStatus?: string 
  comment?: string 
  updatedByName: string
}): Promise<void> {
  const subject = `Chamado Atualizado: ${data.title}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #10B981; color: white; padding: 20px; text-align: center;">
        <h2>Chamado Atualizado</h2>
      </div>
      <div style="padding: 20px; background-color: #f9f9f9;">
        <p><strong>Olá ${data.requesterName},</strong></p>
        <p>Seu chamado foi atualizado por ${data.updatedByName}:</p>
        
        <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="color: #333; margin-top: 0;">${data.title}</h3>
          <p><strong>ID:</strong> #${data.ticketId}</p>
          <p><strong>Status:</strong> ${getStatusLabel(data.status)}</p>
          ${data.previousStatus ? `<p><strong>Status Anterior:</strong> ${getStatusLabel(data.previousStatus)}</p>` : ''}
          <p><strong>Prioridade:</strong> ${getPriorityLabel(data.priority)}</p>
          <p><strong>Categoria:</strong> ${data.category}</p>
          ${data.comment ? `
            <p><strong>Comentário:</strong></p>
            <p style="background-color: #f5f5f5; padding: 10px; border-radius: 3px;">${data.comment}</p>
          ` : ''}
        </div>
        
        <p>Você pode acompanhar o progresso do seu chamado acessando o sistema.</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL}/tickets/${data.ticketId}" 
             style="background-color: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Ver Chamado
          </a>
        </div>
        
        <p style="color: #666; font-size: 12px;">
          Este é um email automático. Por favor, não responda a este email.
        </p>
      </div>
    </div>
  `

  await sendEmail({
    to: data.requesterEmail,
    subject,
    html,
  })
}

export async function sendNewCommentNotification(data: TicketEmailData & {
  comment: string
  commentedByName: string
}): Promise<void> {
  const subject = `Novo Comentário no Chamado: ${data.title}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #F59E0B; color: white; padding: 20px; text-align: center;">
        <h2>Novo Comentário</h2>
      </div>
      <div style="padding: 20px; background-color: #f9f9f9;">
        <p><strong>Olá ${data.assignedToName || 'Equipe de Suporte'},</strong></p>
        <p>${data.commentedByName} adicionou um novo comentário ao chamado:</p>
        
        <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="color: #333; margin-top: 0;">${data.title}</h3>
          <p><strong>ID:</strong> #${data.ticketId}</p>
          <p><strong>Status:</strong> ${getStatusLabel(data.status)}</p>
          <p><strong>Prioridade:</strong> ${getPriorityLabel(data.priority)}</p>
          
          <p><strong>Novo Comentário:</strong></p>
          <p style="background-color: #f5f5f5; padding: 10px; border-radius: 3px;">${data.comment}</p>
        </div>
        
        <p>Clique no link abaixo para responder:</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL}/tickets/${data.ticketId}" 
             style="background-color: #F59E0B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Responder
          </a>
        </div>
        
        <p style="color: #666; font-size: 12px;">
          Este é um email automático. Por favor, não responda a este email.
        </p>
      </div>
    </div>
  `

  // Send to assigned technician or requester depending on who commented
  const recipientEmail = data.commentedByName === data.requesterName 
    ? (data.assignedToEmail || process.env.ADMIN_EMAIL || '')
    : data.requesterEmail

  await sendEmail({
    to: recipientEmail,
    subject,
    html,
  })
}

export async function sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
  const subject = 'Redefinição de Senha - Sistema de Chamados'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #3B82F6; color: white; padding: 20px; text-align: center;">
        <h2>Redefinição de Senha</h2>
      </div>
      <div style="padding: 20px; background-color: #f9f9f9;">
        <p><strong>Olá,</strong></p>
        <p>Você solicitou a redefinição de sua senha no Sistema de Chamados.</p>
        
        <p>Clique no link abaixo para criar uma nova senha:</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${resetLink}" 
             style="background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Redefinir Senha
          </a>
        </div>
        
        <p style="color: #666; font-size: 12px;">
          Este link expirará em 1 hora. Se você não solicitou esta redefinição, ignore este email.
        </p>
        
        <p style="color: #666; font-size: 12px;">
          Este é um email automático. Por favor, não responda a este email.
        </p>
      </div>
    </div>
  `

  await sendEmail({
    to: email,
    subject,
    html,
  })
}

function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    'Open': 'Aberto',
    'In Progress': 'Em Andamento',
    'Resolved': 'Resolvido',
    'Closed': 'Fechado'
  }
  return statusMap[status] || status
}

function getPriorityLabel(priority: string): string {
  const priorityMap: Record<string, string> = {
    'Urgent': 'Urgente',
    'High': 'Alta',
    'Medium': 'Média',
    'Low': 'Baixa'
  }
  return priorityMap[priority] || priority
}