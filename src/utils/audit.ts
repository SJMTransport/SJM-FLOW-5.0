import { api } from '../api';
import { buildMeta, type ActivityMeta } from '../lib/activityLogger';

export { buildMeta };
export type { ActivityMeta };

/**
 * Write an audit log entry. Fire-and-forget — failures are swallowed so they
 * never interrupt the main operation.
 */
export const logAudit = async (
  userName: string,
  userEmail: string,
  action: string,
  meta: ActivityMeta | null | undefined,
  companyId: string
): Promise<void> => {
  try {
    await api.addLog({
      created_at: new Date().toISOString(),
      user_name: userName,
      user_email: userEmail,
      action,
      metadata: meta ? JSON.stringify(meta) : null,
    }, companyId);
  } catch (err) {
    console.error('Audit log failed:', err);
  }
};
