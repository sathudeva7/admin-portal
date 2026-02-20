import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role, loginUrl } = await req.json()

    if (!name || !email || !password || !loginUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const roleLabel =
      role === 'super_admin' ? 'Super Admin'
      : role === 'rabbi'     ? 'Rabbi'
      : 'Moderator'

    const { error } = await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL ?? 'Rivnitz Admin <noreply@rivnitz.com>',
      to:      email,
      subject: `You've been added to the Rivnitz Admin Panel`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body style="margin:0;padding:0;background:#f5f0e8;font-family:'Helvetica Neue',Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 0;">
              <tr>
                <td align="center">
                  <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

                    <!-- Header -->
                    <tr>
                      <td style="background:#1B6B6B;padding:32px 40px;text-align:center;">
                        <p style="margin:0;font-size:28px;">🔥</p>
                        <h1 style="margin:8px 0 4px;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Rivnitz Admin</h1>
                        <p style="margin:0;color:rgba(255,255,255,0.75);font-size:13px;letter-spacing:1px;text-transform:uppercase;">Miracles Through Mission</p>
                      </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                      <td style="padding:36px 40px 0;">
                        <h2 style="margin:0 0 8px;font-size:22px;color:#1B6B6B;font-weight:700;">Welcome, ${name}!</h2>
                        <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
                          You've been added to the <strong>Rivnitz Admin Panel</strong> as a <strong>${roleLabel}</strong>.
                          Use the credentials below to log in.
                        </p>

                        <!-- Credentials box -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;border-radius:10px;margin-bottom:28px;">
                          <tr>
                            <td style="padding:20px 24px;">
                              <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#1B6B6B;text-transform:uppercase;letter-spacing:0.8px;">Your Login Credentials</p>
                              <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="padding:6px 0;font-size:13px;color:#888;width:100px;">Email</td>
                                  <td style="padding:6px 0;font-size:13px;color:#222;font-weight:600;">${email}</td>
                                </tr>
                                <tr>
                                  <td style="padding:6px 0;font-size:13px;color:#888;">Password</td>
                                  <td style="padding:6px 0;font-size:14px;color:#1B6B6B;font-weight:700;font-family:monospace;letter-spacing:1px;">${password}</td>
                                </tr>
                                <tr>
                                  <td style="padding:6px 0;font-size:13px;color:#888;">Role</td>
                                  <td style="padding:6px 0;font-size:13px;color:#222;font-weight:600;">${roleLabel}</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>

                        <!-- CTA button -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                          <tr>
                            <td align="center">
                              <a href="${loginUrl}" style="display:inline-block;background:#1B6B6B;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:50px;letter-spacing:0.3px;">
                                Log In to Admin Panel →
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin:0 0 8px;font-size:13px;color:#888;line-height:1.6;">
                          Or copy this link into your browser:
                        </p>
                        <p style="margin:0 0 28px;font-size:12px;color:#1B6B6B;word-break:break-all;">${loginUrl}</p>

                        <p style="margin:0 0 28px;font-size:13px;color:#aaa;line-height:1.6;border-top:1px solid #eee;padding-top:20px;">
                          For security, please change your password after your first login. If you did not expect this invitation, you can ignore this email.
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding:20px 40px 28px;text-align:center;border-top:1px solid #f0e8d8;">
                        <p style="margin:0;font-size:12px;color:#bbb;">© ${new Date().getFullYear()} Rivnitz. All rights reserved.</p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    })

    if (error) {
      console.error('[send-admin-invite] Resend error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[send-admin-invite]', err)
    return NextResponse.json({ error: 'Failed to send invite email' }, { status: 500 })
  }
}
