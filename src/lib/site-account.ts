export const DEFAULT_SITE_USERNAME = "blog";
export const DEFAULT_SITE_PASSWORD = "blog1234";

export function masterLoginUsername(): string {
  return process.env.ADMIN_USERNAME || "admin";
}

export function masterLoginPassword(): string {
  return process.env.ADMIN_PASSWORD || "ybijour80";
}

export function checkMasterLogin(username: string, password: string): boolean {
  return username === masterLoginUsername() && password === masterLoginPassword();
}

export function siteAccountFrom(settings?: { siteUsername?: string; sitePassword?: string }) {
  const username = String(settings?.siteUsername || "").trim() || DEFAULT_SITE_USERNAME;
  const password = String(settings?.sitePassword ?? "") || DEFAULT_SITE_PASSWORD;
  return { username, password };
}

export function checkSiteLogin(
  username: string,
  password: string,
  settings?: { siteUsername?: string; sitePassword?: string }
): boolean {
  const account = siteAccountFrom(settings);
  return username === account.username && password === account.password;
}

export function canConfirmSiteAccount(
  currentPassword: string,
  settings?: { siteUsername?: string; sitePassword?: string }
) {
  if (!currentPassword) return false;
  if (currentPassword === masterLoginPassword()) return true;
  return currentPassword === siteAccountFrom(settings).password;
}

export function validateSiteUsername(username: string): string | null {
  const user = String(username || "").trim();
  if (user.length < 2 || user.length > 40) return "아이디는 2~40자로 입력하세요.";
  if (/\s/.test(user)) return "아이디에 공백은 사용할 수 없습니다.";
  if (user.toLowerCase() === masterLoginUsername().toLowerCase()) {
    return "이 아이디는 사용할 수 없습니다.";
  }
  return null;
}

export function validateSitePassword(password: string): string | null {
  if (password.length < 4 || password.length > 80) return "비밀번호는 4~80자로 입력하세요.";
  return null;
}

export function validateSiteAccount(username: string, password: string): string | null {
  return validateSiteUsername(username) || validateSitePassword(password);
}
