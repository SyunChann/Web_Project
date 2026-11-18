export const consentVersion = "2026-11-18";
export function validEmail(value: string) { return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
export function validNickname(value: string, allowOperatorName = false) {
  const name = value.toLowerCase();
  return /^[가-힣A-Za-z0-9_-]{2,16}$/.test(value) && name !== "탈퇴한회원"
    && (allowOperatorName || !["admin", "administrator", "관리자", "운영자"].includes(name));
}
export function signupError(error: { status?: number; code?: string }) {
  if (error.status === 429 || ["over_email_send_rate_limit", "over_request_rate_limit"].includes(error.code ?? "")) return "limited";
  if (error.code === "email_address_not_authorized") return "sender";
  if (error.code === "captcha_failed") return "captcha";
  if (error.code === "weak_password") return "password";
  if (error.code === "unexpected_failure") return "unavailable";
  return "send";
}
export const membershipErrors: Record<string, string> = {
  nickname: "닉네임은 한글·영문·숫자·_·- 조합으로 2~16자 입력해 주세요. 운영자 이름은 사용할 수 없습니다.",
  email: "올바른 이메일을 입력해 주세요.", password: "비밀번호는 8자 이상, UTF-8 기준 72바이트 이하로 입력해 주세요. 한글은 최대 길이가 더 짧습니다.", mismatch: "비밀번호가 일치하지 않습니다.",
  consent: "이용약관과 개인정보 수집·이용에 동의해 주세요.", taken: "이미 사용 중인 닉네임입니다.",
  config: "현재 회원 기능을 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.", unavailable: "가입 정보를 처리하지 못했습니다. 닉네임을 다시 확인하거나 잠시 후 시도해 주세요.",
  limited: "메일 발송 또는 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요. 재요청은 최소 60초 간격입니다.",
  sender: "이메일 발송 설정으로 인해 인증 메일을 보낼 수 없습니다. 운영자의 확인이 필요합니다.",
  captcha: "자동 가입 방지 인증을 다시 완료해 주세요.", send: "인증 메일을 요청하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  expired: "인증 링크가 만료되었거나 이미 사용되었습니다. 인증 메일을 다시 요청하거나 로그인해 주세요.",
};
