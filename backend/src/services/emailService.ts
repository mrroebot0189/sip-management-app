import nodemailer from 'nodemailer';

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromAddress = process.env.SMTP_FROM || 'sip-noreply@yourorganisation.com';

  if (!host || !user || !pass) {
    console.warn('[Email] SMTP not configured – emails will not be sent.');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    from: fromAddress,
  });
};

export const sendFeasibilityReviewerEmail = async (opts: {
  toEmail: string;
  reviewerName: string;
  improvementTitle: string;
  departmentName: string;
  projectId: string;
}): Promise<void> => {
  const transporter = createTransporter();
  if (!transporter) return;

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const { toEmail, reviewerName, improvementTitle, departmentName, projectId } = opts;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'sip-noreply@yourorganisation.com',
    to: toEmail,
    subject: `[SIP] Feasibility Review Required: ${improvementTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e3a5f; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Security Improvement Programme</h1>
          <p style="color: #93c5fd; margin: 4px 0 0; font-size: 14px;">Feasibility Review Assignment</p>
        </div>
        <div style="background-color: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 15px;">Dear <strong>${reviewerName}</strong>,</p>
          <p style="color: #334155; font-size: 15px;">You have been assigned to conduct a <strong>feasibility review</strong> for the following Security Improvement Programme project.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569; width: 40%;">Project Title</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${improvementTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Department</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${departmentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Status</td>
              <td style="padding: 8px 12px; background: #f1f5f9;">
                <span style="background-color: #8b5cf6; color: #ffffff; padding: 2px 10px; border-radius: 12px; font-size: 13px; font-weight: 600;">UNDER REVIEW</span>
              </td>
            </tr>
          </table>
          <p style="color: #64748b; font-size: 14px;">Please log in to the Security Improvement Programme to begin your feasibility review.</p>
          <a href="${appUrl}/login" style="display: inline-block; background-color: #7c3aed; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 8px;">Log In &amp; Start Review →</a>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated notification from the Security Improvement Programme. Project reference: ${projectId}</p>
        </div>
      </div>
    `,
  });
};

export const sendProjectApprovedOwnerEmail = async (opts: {
  toEmail: string;
  ownerName: string;
  improvementTitle: string;
  departmentName: string;
  projectId: string;
}): Promise<void> => {
  const transporter = createTransporter();
  if (!transporter) return;

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const { toEmail, ownerName, improvementTitle, departmentName, projectId } = opts;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'sip-noreply@yourorganisation.com',
    to: toEmail,
    subject: `[SIP] Project Approved – Feasibility Review Started: ${improvementTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e3a5f; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Security Improvement Programme</h1>
          <p style="color: #93c5fd; margin: 4px 0 0; font-size: 14px;">Project Approved</p>
        </div>
        <div style="background-color: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 15px;">Dear <strong>${ownerName}</strong>,</p>
          <p style="color: #334155; font-size: 15px;">Your Security Improvement Programme project has been <strong>approved</strong> and is now proceeding to feasibility review.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569; width: 40%;">Project Title</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${improvementTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Department</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${departmentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Status</td>
              <td style="padding: 8px 12px; background: #f1f5f9;">
                <span style="background-color: #8b5cf6; color: #ffffff; padding: 2px 10px; border-radius: 12px; font-size: 13px; font-weight: 600;">FEASIBILITY REVIEW</span>
              </td>
            </tr>
          </table>
          <p style="color: #64748b; font-size: 14px;">A feasibility reviewer has been assigned and will assess your project. You will be notified once the review is complete.</p>
          <a href="${appUrl}/login" style="display: inline-block; background-color: #1e3a5f; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 8px;">View Project →</a>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated notification from the Security Improvement Programme. Project reference: ${projectId}</p>
        </div>
      </div>
    `,
  });
};

export const sendCyberRejectionEmail = async (opts: {
  toEmail: string;
  cyberName: string;
  improvementTitle: string;
  departmentName: string;
  rejectionReason: string;
  projectId: string;
}): Promise<void> => {
  const transporter = createTransporter();
  if (!transporter) return;

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const { toEmail, cyberName, improvementTitle, departmentName, rejectionReason, projectId } = opts;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'sip-noreply@yourorganisation.com',
    to: toEmail,
    subject: `[SIP] Project Rejected: ${improvementTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #7f1d1d; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Security Improvement Programme</h1>
          <p style="color: #fca5a5; margin: 4px 0 0; font-size: 14px;">Project Rejection Notice</p>
        </div>
        <div style="background-color: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 15px;">Dear <strong>${cyberName}</strong>,</p>
          <p style="color: #334155; font-size: 15px;">Unfortunately, the following Security Improvement Programme project has been <strong>rejected</strong> by the Director.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569; width: 40%;">Project Title</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${improvementTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Department</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${departmentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Status</td>
              <td style="padding: 8px 12px; background: #f1f5f9;">
                <span style="background-color: #ef4444; color: #ffffff; padding: 2px 10px; border-radius: 12px; font-size: 13px; font-weight: 600;">REJECTED</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Reason for Rejection</td>
              <td style="padding: 8px 12px; background: #fef2f2; color: #991b1b;">${rejectionReason}</td>
            </tr>
          </table>
          <p style="color: #64748b; font-size: 14px;">You can log in to the system to review the full project details.</p>
          <a href="${appUrl}/sip-projects" style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 8px;">View Projects →</a>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated notification from the Security Improvement Programme. Project reference: ${projectId}</p>
        </div>
      </div>
    `,
  });
};

export const sendFeasibilityReviewSubmittedEmail = async (opts: {
  toEmail: string;
  directorName: string;
  reviewerName: string;
  improvementTitle: string;
  departmentName: string;
  projectId: string;
}): Promise<void> => {
  const transporter = createTransporter();
  if (!transporter) return;

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const { toEmail, directorName, reviewerName, improvementTitle, departmentName, projectId } = opts;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'sip-noreply@yourorganisation.com',
    to: toEmail,
    subject: `[SIP] Feasibility Review Submitted: ${improvementTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e3a5f; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Security Improvement Programme</h1>
          <p style="color: #93c5fd; margin: 4px 0 0; font-size: 14px;">Feasibility Review Completed</p>
        </div>
        <div style="background-color: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 15px;">Dear <strong>${directorName}</strong>,</p>
          <p style="color: #334155; font-size: 15px;">A feasibility review has been submitted for the following project and is ready for your review.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569; width: 40%;">Project Title</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${improvementTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Department</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${departmentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Reviewed By</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${reviewerName}</td>
            </tr>
          </table>
          <p style="color: #64748b; font-size: 14px;">Please log in to the Security Improvement Programme to review the submitted feasibility assessment.</p>
          <a href="${appUrl}/director/dashboard" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 8px;">View in Dashboard →</a>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated notification from the Security Improvement Programme. Project reference: ${projectId}</p>
        </div>
      </div>
    `,
  });
};

export const sendCyberAssistanceRequestEmail = async (opts: {
  toEmail: string;
  requesterName: string;
  requesterEmail: string;
  improvementTitle: string;
  projectId: string;
}): Promise<void> => {
  const transporter = createTransporter();
  if (!transporter) return;

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const { toEmail, requesterName, requesterEmail, improvementTitle, projectId } = opts;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'sip-noreply@yourorganisation.com',
    to: toEmail,
    subject: `[SIP] Cyber Assistance Requested: ${improvementTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e3a5f; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Security Improvement Programme</h1>
          <p style="color: #93c5fd; margin: 4px 0 0; font-size: 14px;">Cyber Assistance Request</p>
        </div>
        <div style="background-color: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 15px;">A team member has requested cyber assistance during a feasibility review.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569; width: 40%;">Improvement Title</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${improvementTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Requested By</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${requesterName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Contact Email</td>
              <td style="padding: 8px 12px; background: #f1f5f9;"><a href="mailto:${requesterEmail}" style="color: #2563eb;">${requesterEmail}</a></td>
            </tr>
          </table>
          <p style="color: #64748b; font-size: 14px;">Please contact the person above to assist them with their feasibility review.</p>
          <a href="${appUrl}/login" style="display: inline-block; background-color: #7c3aed; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 8px;">Log In to SIP →</a>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated notification from the Security Improvement Programme. Project reference: ${projectId}</p>
        </div>
      </div>
    `,
  });
};

export const sendDirectorFeasibilityRejectionEmail = async (opts: {
  toEmail: string;
  cyberName: string;
  improvementTitle: string;
  departmentName: string;
  rejectionReason: string;
  directorName: string;
  projectId: string;
}): Promise<void> => {
  const transporter = createTransporter();
  if (!transporter) return;

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const { toEmail, cyberName, improvementTitle, departmentName, rejectionReason, directorName, projectId } = opts;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'sip-noreply@yourorganisation.com',
    to: toEmail,
    subject: `[SIP] Feasibility Review Rejected – Action Required: ${improvementTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #7f1d1d; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Security Improvement Programme</h1>
          <p style="color: #fca5a5; margin: 4px 0 0; font-size: 14px;">Feasibility Review – Director Rejection Notice</p>
        </div>
        <div style="background-color: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 15px;">Dear <strong>${cyberName}</strong>,</p>
          <p style="color: #334155; font-size: 15px;">The Director has reviewed the feasibility assessment for the project below and has <strong>rejected it</strong>. As Cyber Security, you can review the director's decision and either accept the project to proceed to planning or confirm it as non-implementing.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569; width: 40%;">Project Title</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${improvementTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Department</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${departmentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Rejected By</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${directorName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Reason for Rejection</td>
              <td style="padding: 8px 12px; background: #fef2f2; color: #991b1b;">${rejectionReason}</td>
            </tr>
          </table>
          <p style="color: #64748b; font-size: 14px;">Please log in to review the feasibility assessment and make your decision.</p>
          <a href="${appUrl}/cyber/feasibility-reviews" style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 8px;">Review &amp; Make Decision →</a>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated notification from the Security Improvement Programme. Project reference: ${projectId}</p>
        </div>
      </div>
    `,
  });
};

export const sendFeasibilityAcceptedEmail = async (opts: {
  toEmail: string;
  recipientName: string;
  improvementTitle: string;
  departmentName: string;
  acceptedByName: string;
  projectId: string;
}): Promise<void> => {
  const transporter = createTransporter();
  if (!transporter) return;

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const { toEmail, recipientName, improvementTitle, departmentName, acceptedByName, projectId } = opts;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'sip-noreply@yourorganisation.com',
    to: toEmail,
    subject: `[SIP] Feasibility Accepted – Proceeding to Planning: ${improvementTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #14532d; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Security Improvement Programme</h1>
          <p style="color: #86efac; margin: 4px 0 0; font-size: 14px;">Feasibility Accepted – Proceeding to Planning</p>
        </div>
        <div style="background-color: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 15px;">Dear <strong>${recipientName}</strong>,</p>
          <p style="color: #334155; font-size: 15px;">The feasibility review for the following project has been <strong>accepted</strong> and will now proceed to the planning stage.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569; width: 40%;">Project Title</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${improvementTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Department</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${departmentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Accepted By</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${acceptedByName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Status</td>
              <td style="padding: 8px 12px; background: #f0fdf4;">
                <span style="background-color: #16a34a; color: #ffffff; padding: 2px 10px; border-radius: 12px; font-size: 13px; font-weight: 600;">PROCEEDING TO PLANNING</span>
              </td>
            </tr>
          </table>
          <a href="${appUrl}/project-plans" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 8px;">View Planning →</a>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated notification from the Security Improvement Programme. Project reference: ${projectId}</p>
        </div>
      </div>
    `,
  });
};

export const sendPlanningStartNotificationEmail = async (opts: {
  toEmail: string;
  recipientName: string;
  improvementTitle: string;
  departmentName: string;
  projectId: string;
}): Promise<void> => {
  const transporter = createTransporter();
  if (!transporter) return;

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const { toEmail, recipientName, improvementTitle, departmentName, projectId } = opts;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'sip-noreply@yourorganisation.com',
    to: toEmail,
    subject: `[SIP] Action Required – Begin Planning: ${improvementTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #14532d; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Security Improvement Programme</h1>
          <p style="color: #86efac; margin: 4px 0 0; font-size: 14px;">Planning Stage – Action Required</p>
        </div>
        <div style="background-color: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 15px;">Dear <strong>${recipientName}</strong>,</p>
          <p style="color: #334155; font-size: 15px;">The feasibility review for the following project has been accepted. You are now required to complete the <strong>Project Plan</strong>.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569; width: 40%;">Project Title</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${improvementTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Department</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${departmentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Stage</td>
              <td style="padding: 8px 12px; background: #f0fdf4;">
                <span style="background-color: #16a34a; color: #ffffff; padding: 2px 10px; border-radius: 12px; font-size: 13px; font-weight: 600;">PLANNING</span>
              </td>
            </tr>
          </table>
          <p style="color: #64748b; font-size: 14px;">Please log in to the Security Improvement Programme to begin completing the project plan. You can also assign planning to another team member if required.</p>
          <a href="${appUrl}/project-plans/${projectId}" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 8px;">Start Planning →</a>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated notification from the Security Improvement Programme. Project reference: ${projectId}</p>
        </div>
      </div>
    `,
  });
};

export const sendPlanningAssignmentEmail = async (opts: {
  toEmail: string;
  improvementTitle: string;
  departmentName: string;
  assignedByName: string;
  projectId: string;
}): Promise<void> => {
  const transporter = createTransporter();
  if (!transporter) return;

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const { toEmail, improvementTitle, departmentName, assignedByName, projectId } = opts;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'sip-noreply@yourorganisation.com',
    to: toEmail,
    subject: `[SIP] You Have Been Assigned a Project Plan: ${improvementTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e3a5f; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Security Improvement Programme</h1>
          <p style="color: #93c5fd; margin: 4px 0 0; font-size: 14px;">Project Plan Assignment</p>
        </div>
        <div style="background-color: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 15px;">You have been assigned to complete the project plan for the following Security Improvement Programme project by <strong>${assignedByName}</strong>.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569; width: 40%;">Project Title</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${improvementTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Department</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${departmentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Assigned By</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${assignedByName}</td>
            </tr>
          </table>
          <p style="color: #64748b; font-size: 14px;">Please log in to the Security Improvement Programme to begin completing the project plan. If you do not have an account, please contact your administrator.</p>
          <a href="${appUrl}/login" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 8px;">Log In &amp; Start Planning →</a>
          <p style="color: #64748b; font-size: 13px; margin-top: 16px;">Once logged in, navigate to <strong>Planning</strong> in the sidebar to find your assigned project.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated notification from the Security Improvement Programme. Project reference: ${projectId}</p>
        </div>
      </div>
    `,
  });
};

export const sendPlanSubmittedDirectorEmail = async (opts: {
  toEmail: string;
  directorName: string;
  planManagerName: string;
  improvementTitle: string;
  departmentName: string;
  projectId: string;
}): Promise<void> => {
  const transporter = createTransporter();
  if (!transporter) return;

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const { toEmail, directorName, planManagerName, improvementTitle, departmentName, projectId } = opts;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'sip-noreply@yourorganisation.com',
    to: toEmail,
    subject: `[SIP] Project Plan Submitted for Review: ${improvementTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e3a5f; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Security Improvement Programme</h1>
          <p style="color: #93c5fd; margin: 4px 0 0; font-size: 14px;">Project Plan – Director Review Required</p>
        </div>
        <div style="background-color: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 15px;">Dear <strong>${directorName}</strong>,</p>
          <p style="color: #334155; font-size: 15px;">A project plan has been submitted and is awaiting your review and acceptance.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569; width: 40%;">Project Title</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${improvementTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Department</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${departmentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Submitted By</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${planManagerName}</td>
            </tr>
          </table>
          <p style="color: #64748b; font-size: 14px;">Please log in to review and approve or reject the project plan.</p>
          <a href="${appUrl}/director/plan-review/${projectId}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 8px;">Review Plan →</a>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated notification from the Security Improvement Programme. Project reference: ${projectId}</p>
        </div>
      </div>
    `,
  });
};

export const sendPlanDirectorApprovedEmail = async (opts: {
  toEmail: string;
  recipientName: string;
  improvementTitle: string;
  departmentName: string;
  approvedByName: string;
  projectId: string;
}): Promise<void> => {
  const transporter = createTransporter();
  if (!transporter) return;

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const { toEmail, recipientName, improvementTitle, departmentName, approvedByName, projectId } = opts;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'sip-noreply@yourorganisation.com',
    to: toEmail,
    subject: `[SIP] Project Plan Approved by Director: ${improvementTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #14532d; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Security Improvement Programme</h1>
          <p style="color: #86efac; margin: 4px 0 0; font-size: 14px;">Project Plan Approved – Cyber Review Pending</p>
        </div>
        <div style="background-color: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 15px;">Dear <strong>${recipientName}</strong>,</p>
          <p style="color: #334155; font-size: 15px;">The project plan has been <strong>approved by the Director</strong> and is now pending Cyber Security review.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569; width: 40%;">Project Title</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${improvementTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Department</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${departmentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Approved By</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${approvedByName}</td>
            </tr>
          </table>
          <a href="${appUrl}/cyber/plan-review" style="display: inline-block; background-color: #7c3aed; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 8px;">Review Plan →</a>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated notification from the Security Improvement Programme. Project reference: ${projectId}</p>
        </div>
      </div>
    `,
  });
};

export const sendPlanCyberApprovedEmail = async (opts: {
  toEmail: string;
  recipientName: string;
  improvementTitle: string;
  departmentName: string;
  approvedByName: string;
  projectId: string;
}): Promise<void> => {
  const transporter = createTransporter();
  if (!transporter) return;

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const { toEmail, recipientName, improvementTitle, departmentName, approvedByName, projectId } = opts;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'sip-noreply@yourorganisation.com',
    to: toEmail,
    subject: `[SIP] Project Plan Fully Approved: ${improvementTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #14532d; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Security Improvement Programme</h1>
          <p style="color: #86efac; margin: 4px 0 0; font-size: 14px;">Project Plan Fully Approved</p>
        </div>
        <div style="background-color: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 15px;">Dear <strong>${recipientName}</strong>,</p>
          <p style="color: #334155; font-size: 15px;">The project plan has been <strong>approved by Cyber Security</strong>. The project is now ready to proceed to implementation.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569; width: 40%;">Project Title</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${improvementTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Department</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${departmentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Cyber Approved By</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${approvedByName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Status</td>
              <td style="padding: 8px 12px; background: #f0fdf4;">
                <span style="background-color: #16a34a; color: #ffffff; padding: 2px 10px; border-radius: 12px; font-size: 13px; font-weight: 600;">PLAN COMPLETE</span>
              </td>
            </tr>
          </table>
          <a href="${appUrl}/project-plans/${projectId}" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 8px;">View Project →</a>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated notification from the Security Improvement Programme. Project reference: ${projectId}</p>
        </div>
      </div>
    `,
  });
};

export const sendPlanningCyberAssistanceEmail = async (opts: {
  toEmail: string;
  requesterName: string;
  requesterEmail: string;
  improvementTitle: string;
  projectId: string;
}): Promise<void> => {
  const transporter = createTransporter();
  if (!transporter) return;

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const { toEmail, requesterName, requesterEmail, improvementTitle, projectId } = opts;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'sip-noreply@yourorganisation.com',
    to: toEmail,
    subject: `[SIP] Cyber Assistance Requested During Planning: ${improvementTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e3a5f; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Security Improvement Programme</h1>
          <p style="color: #93c5fd; margin: 4px 0 0; font-size: 14px;">Cyber Assistance Request – Planning Stage</p>
        </div>
        <div style="background-color: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 15px;">A team member has requested cyber assistance during the <strong>planning stage</strong> of a project.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569; width: 40%;">Improvement Title</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${improvementTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Requested By</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${requesterName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Contact Email</td>
              <td style="padding: 8px 12px; background: #f1f5f9;"><a href="mailto:${requesterEmail}" style="color: #2563eb;">${requesterEmail}</a></td>
            </tr>
          </table>
          <p style="color: #64748b; font-size: 14px;">Please contact the person above to assist them with their project planning.</p>
          <a href="${appUrl}/login" style="display: inline-block; background-color: #7c3aed; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 8px;">Log In to SIP →</a>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated notification from the Security Improvement Programme. Project reference: ${projectId}</p>
        </div>
      </div>
    `,
  });
};

// ──────────────────────────────────────────────────────────────
// Stage 5 – Project Start & Active Tracking Emails
// ──────────────────────────────────────────────────────────────

export const sendProjectStartEmail = async (opts: {
  toEmail: string;
  recipientName: string;
  improvementTitle: string;
  departmentName: string;
  projectId: string;
}): Promise<void> => {
  const transporter = createTransporter();
  if (!transporter) return;

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const { toEmail, recipientName, improvementTitle, departmentName, projectId } = opts;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'sip-noreply@yourorganisation.com',
    to: toEmail,
    subject: `[SIP] Project Starting Today: ${improvementTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1d4ed8; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Security Improvement Programme</h1>
          <p style="color: #bfdbfe; margin: 4px 0 0; font-size: 14px;">Project Starting Today</p>
        </div>
        <div style="background-color: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 15px;">Dear <strong>${recipientName}</strong>,</p>
          <p style="color: #334155; font-size: 15px;">The following Security Improvement Programme project is <strong>starting today</strong> and has been logged as an active project.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569; width: 40%;">Project Title</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${improvementTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Department</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${departmentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Status</td>
              <td style="padding: 8px 12px; background: #eff6ff;">
                <span style="background-color: #1d4ed8; color: #ffffff; padding: 2px 10px; border-radius: 12px; font-size: 13px; font-weight: 600;">ACTIVE</span>
              </td>
            </tr>
          </table>
          <p style="color: #64748b; font-size: 14px;">Monthly status updates will be requested throughout the project lifecycle. Please log in to submit updates when prompted.</p>
          <a href="${appUrl}/active-projects" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 8px;">View Active Projects →</a>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated notification from the Security Improvement Programme. Project reference: ${projectId}</p>
        </div>
      </div>
    `,
  });
};

export const sendStatusUpdateNotificationEmail = async (opts: {
  toEmail: string;
  recipientName: string;
  improvementTitle: string;
  departmentName: string;
  updateStatus: string;
  comment: string;
  submittedByName: string;
  projectId: string;
}): Promise<void> => {
  const transporter = createTransporter();
  if (!transporter) return;

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const { toEmail, recipientName, improvementTitle, departmentName, updateStatus, comment, submittedByName, projectId } = opts;
  const statusLabel = updateStatus.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'sip-noreply@yourorganisation.com',
    to: toEmail,
    subject: `[SIP] Status Update – ${improvementTitle}: ${statusLabel}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e3a5f; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Security Improvement Programme</h1>
          <p style="color: #93c5fd; margin: 4px 0 0; font-size: 14px;">Project Status Update</p>
        </div>
        <div style="background-color: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 15px;">Dear <strong>${recipientName}</strong>,</p>
          <p style="color: #334155; font-size: 15px;">A status update has been submitted for the following project.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569; width: 40%;">Project Title</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${improvementTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Department</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${departmentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Updated Status</td>
              <td style="padding: 8px 12px; background: #f1f5f9;">
                <span style="background-color: #2563eb; color: #ffffff; padding: 2px 10px; border-radius: 12px; font-size: 13px; font-weight: 600;">${statusLabel}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Submitted By</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${submittedByName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Comment</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${comment}</td>
            </tr>
          </table>
          <a href="${appUrl}/active-projects" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 8px;">View Project Tracker →</a>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated notification from the Security Improvement Programme. Project reference: ${projectId}</p>
        </div>
      </div>
    `,
  });
};

export const sendUrgentStatusAlertEmail = async (opts: {
  toEmail: string;
  improvementTitle: string;
  departmentName: string;
  updateStatus: string;
  comment: string;
  submittedByName: string;
  submittedByEmail: string;
  projectId: string;
}): Promise<void> => {
  const transporter = createTransporter();
  if (!transporter) return;

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const { toEmail, improvementTitle, departmentName, updateStatus, comment, submittedByName, submittedByEmail, projectId } = opts;
  const statusLabel = updateStatus.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'sip-noreply@yourorganisation.com',
    to: toEmail,
    subject: `[SIP] URGENT – Action Required: ${improvementTitle} – ${statusLabel}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #b91c1c; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Security Improvement Programme</h1>
          <p style="color: #fecaca; margin: 4px 0 0; font-size: 14px;">URGENT – Immediate Action Required</p>
        </div>
        <div style="background-color: #f8fafc; padding: 24px; border: 1px solid #fecaca; border-top: none; border-radius: 0 0 8px 8px;">
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px;">
            <p style="color: #991b1b; font-weight: bold; margin: 0; font-size: 15px;">Urgent attention is required for the project below. Please contact the team immediately.</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569; width: 40%;">Project Title</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${improvementTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Department</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${departmentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Status</td>
              <td style="padding: 8px 12px; background: #fef2f2;">
                <span style="background-color: #dc2626; color: #ffffff; padding: 2px 10px; border-radius: 12px; font-size: 13px; font-weight: 600;">${statusLabel}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Reported By</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${submittedByName} (<a href="mailto:${submittedByEmail}" style="color: #2563eb;">${submittedByEmail}</a>)</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Comment</td>
              <td style="padding: 8px 12px; background: #fef2f2; color: #991b1b;">${comment}</td>
            </tr>
          </table>
          <a href="${appUrl}/active-projects" style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 8px;">View Project &amp; Take Action →</a>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated urgent notification from the Security Improvement Programme. Project reference: ${projectId}</p>
        </div>
      </div>
    `,
  });
};

export const sendProjectCompleteNotificationEmail = async (opts: {
  toEmail: string;
  recipientName: string;
  improvementTitle: string;
  departmentName: string;
  completedByName: string;
  projectId: string;
}): Promise<void> => {
  const transporter = createTransporter();
  if (!transporter) return;

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const { toEmail, recipientName, improvementTitle, departmentName, completedByName, projectId } = opts;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'sip-noreply@yourorganisation.com',
    to: toEmail,
    subject: `[SIP] Project Complete – Validation Required: ${improvementTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #14532d; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Security Improvement Programme</h1>
          <p style="color: #86efac; margin: 4px 0 0; font-size: 14px;">Project Complete – Closure Validation Required</p>
        </div>
        <div style="background-color: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 15px;">Dear <strong>${recipientName}</strong>,</p>
          <p style="color: #334155; font-size: 15px;">The team has marked the following project as <strong>Project Complete</strong>. As Cyber Security, you are required to validate the closure before the project is formally closed.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569; width: 40%;">Project Title</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${improvementTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Department</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${departmentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Completed By</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${completedByName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Action Required</td>
              <td style="padding: 8px 12px; background: #fefce8; color: #92400e; font-weight: 600;">Validate and close the project</td>
            </tr>
          </table>
          <p style="color: #64748b; font-size: 14px;">Please log in to review and validate the project closure.</p>
          <a href="${appUrl}/cyber/completed-projects" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 8px;">Validate Closure →</a>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated notification from the Security Improvement Programme. Project reference: ${projectId}</p>
        </div>
      </div>
    `,
  });
};

export const sendClosureVerifiedEmail = async (opts: {
  toEmail: string;
  recipientName: string;
  improvementTitle: string;
  departmentName: string;
  verifiedByName: string;
  projectId: string;
}): Promise<void> => {
  const transporter = createTransporter();
  if (!transporter) return;

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const { toEmail, recipientName, improvementTitle, departmentName, verifiedByName, projectId } = opts;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'sip-noreply@yourorganisation.com',
    to: toEmail,
    subject: `[SIP] Project Closed & Verified: ${improvementTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e3a5f; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Security Improvement Programme</h1>
          <p style="color: #93c5fd; margin: 4px 0 0; font-size: 14px;">Project Closed &amp; Verified</p>
        </div>
        <div style="background-color: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 15px;">Dear <strong>${recipientName}</strong>,</p>
          <p style="color: #334155; font-size: 15px;">The following project has been formally <strong>closed and verified</strong> by Cyber Security.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569; width: 40%;">Project Title</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${improvementTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Department</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${departmentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Verified By</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${verifiedByName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Status</td>
              <td style="padding: 8px 12px; background: #f0fdf4;">
                <span style="background-color: #16a34a; color: #ffffff; padding: 2px 10px; border-radius: 12px; font-size: 13px; font-weight: 600;">CLOSED &amp; VERIFIED</span>
              </td>
            </tr>
          </table>
          <a href="${appUrl}/closed-projects" style="display: inline-block; background-color: #1e3a5f; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 8px;">View Closed Projects →</a>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated notification from the Security Improvement Programme. Project reference: ${projectId}</p>
        </div>
      </div>
    `,
  });
};

export const sendMonthlyStatusRequestEmail = async (opts: {
  toEmail: string;
  recipientName: string;
  improvementTitle: string;
  departmentName: string;
  projectId: string;
}): Promise<void> => {
  const transporter = createTransporter();
  if (!transporter) return;

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const { toEmail, recipientName, improvementTitle, departmentName, projectId } = opts;
  const monthYear = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'sip-noreply@yourorganisation.com',
    to: toEmail,
    subject: `[SIP] Monthly Status Update Required – ${monthYear}: ${improvementTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #7c3aed; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Security Improvement Programme</h1>
          <p style="color: #ddd6fe; margin: 4px 0 0; font-size: 14px;">Monthly Status Update Required</p>
        </div>
        <div style="background-color: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 15px;">Dear <strong>${recipientName}</strong>,</p>
          <p style="color: #334155; font-size: 15px;">It's time to submit the <strong>${monthYear}</strong> status update for the project below.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569; width: 40%;">Project Title</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${improvementTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Department</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${departmentName}</td>
            </tr>
          </table>
          <p style="color: #64748b; font-size: 14px;">Please log in and select the current status with a brief comment describing progress.</p>
          <a href="${appUrl}/active-projects/${projectId}/status-update" style="display: inline-block; background-color: #7c3aed; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 8px;">Submit Status Update →</a>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated notification from the Security Improvement Programme. Project reference: ${projectId}</p>
        </div>
      </div>
    `,
  });
};

export const sendSipSubmissionEmail = async (opts: {
  toEmail: string;
  departmentName: string;
  improvementTitle: string;
  submittedByName: string;
  projectId: string;
}): Promise<void> => {
  const transporter = createTransporter();
  if (!transporter) return;

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const { toEmail, departmentName, improvementTitle, submittedByName, projectId } = opts;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'sip-noreply@yourorganisation.com',
    to: toEmail,
    subject: `[SIP] New Security Improvement Project: ${improvementTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e3a5f; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Security Improvement Programme</h1>
          <p style="color: #93c5fd; margin: 4px 0 0; font-size: 14px;">New Project Notification</p>
        </div>
        <div style="background-color: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 15px;">You have a new Security Improvement Programme project assigned to <strong>${departmentName}</strong>.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569; width: 40%;">Project Title</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${improvementTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Department</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${departmentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Submitted By</td>
              <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${submittedByName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Status</td>
              <td style="padding: 8px 12px; background: #f1f5f9;">
                <span style="background-color: #3b82f6; color: #ffffff; padding: 2px 10px; border-radius: 12px; font-size: 13px; font-weight: 600;">NEW</span>
              </td>
            </tr>
          </table>
          <p style="color: #64748b; font-size: 14px;">Please log in to the Security Improvement Programme to review and action this project.</p>
          <a href="${appUrl}/director/dashboard" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 8px;">View in Dashboard →</a>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated notification from the Security Improvement Programme. Project reference: ${projectId}</p>
        </div>
      </div>
    `,
  });
};
