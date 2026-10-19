/** Suggest a form-rule preset from answer-key instruction hints. */
export function suggestPresetFromHints(
  hints: Array<string | null | undefined>,
): string {
  const joined = hints.filter(Boolean).join(" ");
  if (/기약|약분|분수/.test(joined)) return "ELEM_FRACTION";
  if (/근호|유리화|제곱근/.test(joined)) return "MIDDLE_RADICAL";
  if (/전개|인수분해/.test(joined)) return "EXPAND_FACTOR";
  return "DEFAULT";
}

export const PRESET_OPTIONS = [
  { value: "DEFAULT", label: "기본 (형태 차이는 △)" },
  { value: "ELEM_FRACTION", label: "초등 분수 (약분 안 하면 ✕)" },
  { value: "MIDDLE_RADICAL", label: "중등 근호 (미정리·유리화 ✕)" },
  { value: "EXPAND_FACTOR", label: "전개·인수분해 (미완 ✕)" },
] as const;
