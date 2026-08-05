export type SigningInviteEmailParams = {
  clientContactFirstName: string;
  clientLegalName: string;
  contractName: string;
  contractNumber: string;
  customerId: string;
  temporaryAccessCode: string;
  signatureDueDate: string;
  expirationDate: string;
  signingLink: string;
  agencyName: string;
  agencyContactName: string;
  agencyContactEmail: string;
};

function firstName(fullName: string) {
  const part = fullName.trim().split(/\s+/)[0];
  return part || "there";
}

export function buildSigningInviteEmail(params: SigningInviteEmailParams) {
  const agency = params.agencyName || "Rebel Marketing";
  const contactFirst = firstName(params.clientContactFirstName);
  const subject = `Signature Requested: ${params.contractName}`;

  const text = `Hello ${contactFirst},

${agency} has prepared the ${params.contractName} for your review and signature.

Please use the information below to securely access the agreement:

Customer ID: ${params.customerId}
Temporary Access Code: ${params.temporaryAccessCode}
Signature Due Date: ${params.signatureDueDate}

To review and sign the agreement:

1. Select the secure link below.
2. Enter your Customer ID and temporary access code.
3. Review the complete agreement.
4. Confirm that you are authorized to sign on behalf of your organization.
5. Enter your signature and select Sign & Submit.

Review and Sign Agreement: ${params.signingLink}

For security, this access code will expire on ${params.expirationDate} and may only be used for this signature request. Please do not forward this email or share the access code.

Please contact ${params.agencyContactName} at ${params.agencyContactEmail} if you have questions or need assistance.

Thank you,
${agency}

—
${params.clientLegalName} · ${params.contractNumber}
`;

  const html = `<!DOCTYPE html>
<html>
<body style="font-family:Georgia,serif;line-height:1.5;color:#1a1a1a;">
  <p>Hello ${escapeHtml(contactFirst)},</p>
  <p>${escapeHtml(agency)} has prepared the <strong>${escapeHtml(params.contractName)}</strong> for your review and signature.</p>
  <p>Please use the information below to securely access the agreement:</p>
  <ul>
    <li><strong>Customer ID:</strong> ${escapeHtml(params.customerId)}</li>
    <li><strong>Temporary Access Code:</strong> ${escapeHtml(params.temporaryAccessCode)}</li>
    <li><strong>Signature Due Date:</strong> ${escapeHtml(params.signatureDueDate)}</li>
  </ul>
  <p>To review and sign the agreement:</p>
  <ol>
    <li>Select the secure link below.</li>
    <li>Enter your Customer ID and temporary access code.</li>
    <li>Review the complete agreement.</li>
    <li>Confirm that you are authorized to sign on behalf of your organization.</li>
    <li>Enter your signature and select Sign &amp; Submit.</li>
  </ol>
  <p><a href="${escapeHtml(params.signingLink)}">Review and Sign Agreement</a></p>
  <p style="font-size:0.9em;color:#555;">For security, this access code will expire on ${escapeHtml(params.expirationDate)} and may only be used for this signature request. Please do not forward this email or share the access code.</p>
  <p>Please contact ${escapeHtml(params.agencyContactName)} at <a href="mailto:${escapeHtml(params.agencyContactEmail)}">${escapeHtml(params.agencyContactEmail)}</a> if you have questions or need assistance.</p>
  <p>Thank you,<br/>${escapeHtml(agency)}</p>
  <p style="font-size:0.85em;color:#777;">${escapeHtml(params.clientLegalName)} · ${escapeHtml(params.contractNumber)}</p>
</body>
</html>`;

  return { subject, text, html };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
