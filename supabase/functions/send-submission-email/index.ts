import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // ✅ CORS preflight
  if (req?.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const payload = await req?.json();

    // Supabase DB webhook sends { type, table, record, old_record }
    const record = payload?.record;

    if (!record) {
      return new Response(JSON.stringify({ error: "No record in payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Fetch the user's email from user_profiles
    const supabaseAdmin = createClient(
      (typeof Deno !== "undefined" ? Deno?.env?.get("SUPABASE_URL") : undefined) ?? "",
      (typeof Deno !== "undefined" ? Deno?.env?.get("SUPABASE_SERVICE_ROLE_KEY") : undefined) ?? ""
    );

    const { data: profile, error: profileError } = await supabaseAdmin?.from("user_profiles")?.select("email, full_name")?.eq("id", record?.user_id)?.single();

    if (profileError || !profile?.email) {
      console.error("Could not fetch user profile:", profileError?.message);
      return new Response(JSON.stringify({ error: "User profile not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const resendApiKey = (typeof Deno !== "undefined" ? Deno?.env?.get("RESEND_API_KEY") : undefined) ?? "";
    const recipientName = profile?.full_name || "there";
    const jobTitle = record?.job_title || "the position";
    const company = record?.company || "the company";
    const cvName = record?.cv_name || "your CV";
    const jobUrl = record?.job_url || "";
    const notes = record?.notes || "";
    const submittedAt = new Date(record.submitted_at)?.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CV Submission Logged</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#18181b;border:1px solid #27272a;border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#0d9488;padding:24px 32px;">
              <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:3px;color:#ccfbf1;text-transform:uppercase;">AICockpit</p>
              <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;">CV Submission Logged</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px;font-size:15px;color:#a1a1aa;">Hey ${recipientName},</p>
              <p style="margin:0 0 24px;font-size:15px;color:#d4d4d8;line-height:1.6;">
                Your CV submission has been tracked in AICockpit. Here's a summary:
              </p>

              <!-- Submission Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;border:1px solid #27272a;border-radius:8px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #27272a;">
                    <p style="margin:0;font-size:10px;font-weight:600;letter-spacing:2px;color:#71717a;text-transform:uppercase;">Position</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#f4f4f5;">${jobTitle}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #27272a;">
                    <p style="margin:0;font-size:10px;font-weight:600;letter-spacing:2px;color:#71717a;text-transform:uppercase;">Company</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#f4f4f5;">${company}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #27272a;">
                    <p style="margin:0;font-size:10px;font-weight:600;letter-spacing:2px;color:#71717a;text-transform:uppercase;">CV Sent</p>
                    <p style="margin:4px 0 0;font-size:14px;color:#a1a1aa;">${cvName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:${jobUrl ? "1px solid #27272a" : "none"};">
                    <p style="margin:0;font-size:10px;font-weight:600;letter-spacing:2px;color:#71717a;text-transform:uppercase;">Submitted</p>
                    <p style="margin:4px 0 0;font-size:14px;color:#a1a1aa;">${submittedAt}</p>
                  </td>
                </tr>
                ${jobUrl ? `
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:10px;font-weight:600;letter-spacing:2px;color:#71717a;text-transform:uppercase;">Job URL</p>
                    <a href="${jobUrl}" style="margin:4px 0 0;display:block;font-size:14px;color:#2dd4bf;text-decoration:none;">${jobUrl}</a>
                  </td>
                </tr>` : ""}
              </table>

              ${notes ? `
              <div style="background:#1c1c1e;border-left:3px solid #0d9488;border-radius:0 6px 6px 0;padding:14px 16px;margin-bottom:24px;">
                <p style="margin:0 0 6px;font-size:10px;font-weight:600;letter-spacing:2px;color:#71717a;text-transform:uppercase;">Notes</p>
                <p style="margin:0;font-size:14px;color:#a1a1aa;line-height:1.6;">${notes}</p>
              </div>` : ""}

              <p style="margin:0;font-size:14px;color:#71717a;line-height:1.6;">
                Track your submission status and follow-ups in your 
                <a href="https://app.nomorequiet.com/submissions" style="color:#2dd4bf;text-decoration:none;">Submissions dashboard</a>.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #27272a;">
              <p style="margin:0;font-size:12px;color:#52525b;text-align:center;">
                AICockpit · <a href="https://app.nomorequiet.com" style="color:#52525b;">app.nomorequiet.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: [profile?.email],
        subject: `CV Submitted to ${company} — ${jobTitle}`,
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse?.json();

    if (!resendResponse?.ok) {
      console.error("Resend API error:", resendData);
      return new Response(JSON.stringify({ error: "Email send failed", details: resendData }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    return new Response(JSON.stringify({ success: true, emailId: resendData.id }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
