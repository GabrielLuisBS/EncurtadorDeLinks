import { Resend } from "resend";

// Sem RESEND_API_KEY (ex.: dev local sem configurar), o client fica
// null e sendVerificationEmail vira no-op logado — não trava o registro
// nem quebra em ambiente sem esse env var. Ver EMAIL_FROM: sem domínio
// verificado no Resend, "onboarding@resend.dev" só consegue mandar para
// o e-mail dono da conta Resend (modo sandbox) — documentado em
// back/.env.example.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Linkly <onboarding@resend.dev>";

export const emailService = {
  async sendVerificationEmail(destino: string, nome: string, linkVerificacao: string): Promise<void> {
    if (!resend) {
      console.warn(
        `[email] RESEND_API_KEY não configurada — e-mail de verificação para ${destino} não enviado. Link: ${linkVerificacao}`,
      );
      return;
    }

    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: destino,
      subject: "Confirme seu e-mail no Linkly",
      html: `
        <p>Oi, ${nome}!</p>
        <p>Confirme seu e-mail no Linkly clicando no link abaixo:</p>
        <p><a href="${linkVerificacao}">${linkVerificacao}</a></p>
        <p>Se você não criou essa conta, pode ignorar este e-mail — sua conta continua funcionando normalmente sem a confirmação.</p>
        <p>O link expira em 24 horas.</p>
      `,
    });

    if (error) {
      // Não propaga: um envio falho não pode derrubar o registro em si
      // (a conta já existe e funciona sem e-mail verificado — ver
      // Usuario.emailVerificadoEm no schema). Só loga pra investigar.
      console.error(`[email] falha ao enviar verificação para ${destino}:`, error);
    }
  },
};
