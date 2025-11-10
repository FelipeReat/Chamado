// Email service placeholder
export async function sendEmail(to: string, subject: string, body: string) {
  console.log(`Email enviado para ${to}: ${subject}`)
  return { success: true }
}