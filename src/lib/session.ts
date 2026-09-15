let sessionUserId: string | null | undefined

export function getSessionUserId(): string | null | undefined {
  return sessionUserId
}

export function rememberSessionUserId(userId: string | null) {
  sessionUserId = userId
}
