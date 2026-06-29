export type UserRole = "admin" | "designer" | "developer";

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};
