export type WelcomeActivationEmailParams = {
  clientContactFirstName: string;
  clientBusinessName: string;
  contractName: string;
  customerId: string;
  activationLink: string;
  activationCode: string;
  expirationDate: string;
  agencyName: string;
  agencyContactName: string;
  agencyContactEmail: string;
};

function firstName(fullName: string) {
  const part = fullName.trim().split(/\s+/)[0];
  return part || "there";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildWelcomeActivationEmail(params: WelcomeActivationEmailParams) {
  const agency = params.agencyName || "Rebel Marketing";
  const contactFirst = firstName(params.clientContactFirstName);
  const subject = `Welcome to ${agency} — Your Agreement Has Been Signed`;

  const text = `Hello ${contactFirst},

Thank you for reviewing and signing the ${params.contractName}. We are excited to begin working with ${params.clientBusinessName} and look forward to building a successful partnership.

Your signed agreement has been received successfully.

Customer ID: ${params.customerId}

The next step is to activate your client-dashboard access. Your dashboard will allow you to:

Review your contract and engagement details
Monitor campaign progress and deliverables
Approve submitted marketing materials
Review advertising budgets and activity
View invoices and account information
Access your fully executed agreement

Activate Your Client Dashboard: ${params.activationLink}

One-Time Activation Code: ${params.activationCode}

This activation code is valid until ${params.expirationDate} and can only be used once. After activation, you will create your own permanent password and use the normal client login page for future access.

We are enthusiastic about the opportunity to work together and are excited to begin supporting your marketing goals.

Please contact ${params.agencyContactName} at ${params.agencyContactEmail} if you need assistance.

Thank you,
${agency}
`;

  const html = `<!DOCTYPE html>
<html><body style="font-family:Georgia,serif;line-height:1.5;color:#1a1a1a;">
<p>Hello ${escapeHtml(contactFirst)},</p>
<p>Thank you for reviewing and signing the <strong>${escapeHtml(params.contractName)}</strong>. We are excited to begin working with <strong>${escapeHtml(params.clientBusinessName)}</strong> and look forward to building a successful partnership.</p>
<p>Your signed agreement has been received successfully.</p>
<p><strong>Customer ID:</strong> ${escapeHtml(params.customerId)}</p>
<p>The next step is to activate your client-dashboard access. Your dashboard will allow you to:</p>
<ul>
<li>Review your contract and engagement details</li>
<li>Monitor campaign progress and deliverables</li>
<li>Approve submitted marketing materials</li>
<li>Review advertising budgets and activity</li>
<li>View invoices and account information</li>
<li>Access your fully executed agreement</li>
</ul>
<p><a href="${escapeHtml(params.activationLink)}">Activate Your Client Dashboard</a></p>
<p><strong>One-Time Activation Code:</strong> ${escapeHtml(params.activationCode)}</p>
<p style="font-size:0.9em;color:#555;">This activation code is valid until ${escapeHtml(params.expirationDate)} and can only be used once. After activation, you will create your own permanent password and use the normal client login page for future access.</p>
<p>Please contact ${escapeHtml(params.agencyContactName)} at <a href="mailto:${escapeHtml(params.agencyContactEmail)}">${escapeHtml(params.agencyContactEmail)}</a> if you need assistance.</p>
<p>Thank you,<br/>${escapeHtml(agency)}</p>
</body></html>`;

  return { subject, text, html };
}

export type ThanksEmailParams = {
  clientContactFirstName: string;
  clientBusinessName: string;
  contractName: string;
  customerId: string;
  loginLink: string;
  agencyName: string;
  agencyContactName: string;
  agencyContactEmail: string;
};

export function buildPostSignThanksEmail(params: ThanksEmailParams) {
  const agency = params.agencyName || "Rebel Marketing";
  const contactFirst = firstName(params.clientContactFirstName);
  const subject = `Thank you — ${params.contractName} has been signed`;

  const text = `Hello ${contactFirst},

Thank you for reviewing and signing the ${params.contractName}. We are excited to begin working with ${params.clientBusinessName}.

Your signed agreement has been received successfully.

Customer ID: ${params.customerId}

You already have client-dashboard access. Sign in with your existing credentials:

${params.loginLink}

Please contact ${params.agencyContactName} at ${params.agencyContactEmail} if you need assistance.

Thank you,
${agency}
`;

  const html = `<!DOCTYPE html>
<html><body style="font-family:Georgia,serif;line-height:1.5;color:#1a1a1a;">
<p>Hello ${escapeHtml(contactFirst)},</p>
<p>Thank you for reviewing and signing the <strong>${escapeHtml(params.contractName)}</strong>. We are excited to begin working with <strong>${escapeHtml(params.clientBusinessName)}</strong>.</p>
<p>Your signed agreement has been received successfully.</p>
<p><strong>Customer ID:</strong> ${escapeHtml(params.customerId)}</p>
<p>You already have client-dashboard access. <a href="${escapeHtml(params.loginLink)}">Sign in to your client portal</a> with your existing credentials.</p>
<p>Please contact ${escapeHtml(params.agencyContactName)} at <a href="mailto:${escapeHtml(params.agencyContactEmail)}">${escapeHtml(params.agencyContactEmail)}</a> if you need assistance.</p>
<p>Thank you,<br/>${escapeHtml(agency)}</p>
</body></html>`;

  return { subject, text, html };
}
