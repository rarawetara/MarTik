/** Props for Russian spellcheck + mobile sentence capitalization (browser hints). */
export const textInputLocaleProps = {
  lang: 'ru',
  spellCheck: true as const,
  autoCapitalize: 'sentences' as const,
}

/** Capitalize first letter of the string (locale-aware). */
export function capitalizeFirst(value: string): string {
  const t = value.trimStart()
  if (!t) return value
  const lead = value.length - value.trimStart().length
  const first = value[lead]
  if (!first) return value
  return value.slice(0, lead) + first.toLocaleUpperCase('ru-RU') + value.slice(lead + 1)
}

/**
 * Capitalize first letter after sentence boundaries (. ! ?) and newlines.
 * Use on blur for multi-line notes so typing isn’t disrupted mid-word.
 */
export function capitalizeSentenceStarts(value: string): string {
  return value.replace(/(^|[.!?]\s+|\n)([a-zа-яё])/gi, (_m, p1: string, p2: string) => {
    return p1 + p2.toLocaleUpperCase('ru-RU')
  })
}
