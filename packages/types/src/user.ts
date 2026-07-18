import type { UserId, UserRole } from "./common";

/**
 * An admin console account. The public app has no auth — users exist only for
 * the login-protected admin (admin → Settings → Admin accounts).
 */
export interface User {
  id: UserId;
  name: string;
  email: string;
  role: UserRole;
}
