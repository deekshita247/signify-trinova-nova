export interface Review {
  source: string;
  validation?: "reference-demo" | "validated";
  license: string;
  reviewedBy: string;
  reviewedOn: string;
}
export interface SignAsset extends Review {
  aliases?: string[];
  description?: string;
  hands?: "right" | "both";
  id: string;
  label: string;
  kind: "sign" | "fingerspelling";
  rigId: string;
  url: string;
  animationName?: string;
  cues: { start: number; caption: string }[];
}
export interface Phrase extends Review {
  text: string;
  signIds: string[];
  transitionSeconds: number;
}
export interface Catalog {
  version: 1;
  language: string | null;
  rig: { id: string; url: string | null };
  signs: SignAsset[];
  phrases: Phrase[];
}
export interface Plan {
  text: string;
  language: string;
  signs: SignAsset[];
  transitionSeconds: number;
  mode: "phrases" | "vocabulary";
}
export type Resolution =
  | { ok: true; plan: Plan }
  | { ok: false; error: string; unsupported: string[] };
export const normalize = (s: string) =>
  s.normalize("NFKC").toLowerCase().replace(/[’']/gu, "")
    .replace(/\p{P}/gu, " ").trim().replace(/\s+/g, " ");
function hasProvenance(value: Review) {
  if (value.validation === "reference-demo")
    return Boolean(value.source?.trim() && value.license?.trim());
  if (value.validation !== undefined && value.validation !== "validated")
    return false;
  return (["source", "license", "reviewedBy", "reviewedOn"] as const).every(
    (key) =>
      typeof value[key] === "string" && value[key].trim(),
  );
}
export function validateCatalog(value: unknown): Catalog {
  const c = value as Catalog;
  if (
    !c ||
    c.version !== 1 ||
    (c.language !== null &&
      (typeof c.language !== "string" || !c.language.trim())) ||
    !c.rig?.id ||
    !(c.rig.url === null || typeof c.rig.url === "string") ||
    !Array.isArray(c.signs) ||
    !Array.isArray(c.phrases)
  )
    throw new Error(
      "Invalid signing catalog. Check its version, language, rig, signs, and phrases.",
    );
  const ids = new Set<string>();
  const labels = new Set<string>();
  const motions = new Set<string>();
  for (const s of c.signs) {
    if (
      !c.language ||
      !s.id ||
      ids.has(s.id) ||
      !s.label?.trim() ||
      !["sign", "fingerspelling"].includes(s.kind) ||
      s.rigId !== c.rig.id ||
      !s.url ||
      !hasProvenance(s) ||
      !Array.isArray(s.cues) ||
      s.cues.some(
        (cue, i) =>
          !Number.isFinite(cue.start) ||
          cue.start < 0 ||
          !cue.caption ||
          (i > 0 && cue.start < s.cues[i - 1].start),
      )
    )
      throw new Error(
        "Unreviewed, duplicate, or incompatible signing asset in catalog.",
      );
    ids.add(s.id);
    const motion = `${s.url}#${s.animationName || ""}`;
    if (motions.has(motion)) throw new Error("Different signs cannot reuse the same animation; use aliases for synonyms.");
    motions.add(motion);
    if (s.aliases !== undefined && (!Array.isArray(s.aliases) || s.aliases.some(a => typeof a !== "string" || !normalize(a))))
      throw new Error("Invalid sign aliases.");
    for (const label of [s.label, ...(s.aliases || [])]) {
      const key = normalize(label);
      if (!key || labels.has(key)) throw new Error("Ambiguous sign dictionary label or alias.");
      labels.add(key);
    }
  }
  const phrases = new Set<string>();
  for (const p of c.phrases) {
    if (
      !p.text?.trim() ||
      phrases.has(normalize(p.text)) ||
      !hasProvenance(p) ||
      !Array.isArray(p.signIds) ||
      !p.signIds.length ||
      p.signIds.some((id) => !ids.has(id)) ||
      !Number.isFinite(p.transitionSeconds) ||
      p.transitionSeconds < 0 ||
      p.transitionSeconds > 1
    )
      throw new Error("Invalid phrase plan or missing sign reference.");
    phrases.add(normalize(p.text));
  }
  return c;
}
export function resolveInput(
  text: string,
  catalog: Catalog,
  mode: Plan["mode"],
): Resolution {
  const fail = (error: string, unsupported: string[] = []): Resolution => ({
    ok: false,
    error,
    unsupported,
  });
  if (!normalize(text)) return fail("Type a message or use the microphone first.");
  if (text.length > 500)
    return fail(
      "Your message exceeds 500 characters. Shorten it before preparing signing.",
    );
  if (!catalog.language)
    return fail(
      "Choose and confirm a target sign language before connecting a signing pack. No signing language is established in this project.",
    );
  if (!catalog.signs.length)
    return fail(
      `No reviewed ${catalog.language} animations are installed. Your input was received, but the avatar cannot sign it yet.`,
    );
  const phrase = catalog.phrases.find(
    (p) => normalize(p.text) === normalize(text),
  );
  if (mode === "phrases") {
    if (!phrase)
      return fail(
        "No reviewed phrase sequence matches this input. Try a supported phrase or explicitly choose vocabulary practice.",
        [text.trim()],
      );
    return {
      ok: true,
      plan: {
        text,
        language: catalog.language,
        signs: phrase.signIds.map(
          (id) => catalog.signs.find((s) => s.id === id) as SignAsset,
        ),
        transitionSeconds: phrase.transitionSeconds,
        mode,
      },
    };
  }
  // Vocabulary demonstration only; never presented as sentence translation.
  const words = normalize(text).split(/\s+/);
  const byId = new Map(catalog.signs.map(sign => [sign.id, sign]));
  const dictionary = [
    ...catalog.phrases.map(p => ({ signs: p.signIds.map(id => {
      const sign = byId.get(id);
      if (!sign) throw new Error(`Missing sign mapping: ${id}`);
      return sign;
    }), words: normalize(p.text).split(" ") })),
    ...catalog.signs.filter(s => s.kind === "sign").flatMap(sign =>
      [sign.label, ...(sign.aliases || [])].map(label => ({ signs: [sign], words: normalize(label).split(" ") }))),
  ].sort((a, b) => b.words.length - a.words.length);
  const signs: SignAsset[] = [],
    unsupported: string[] = [];
  for (let i = 0; i < words.length;) {
    const match = dictionary.find((entry) =>
      entry.words.every((word, offset) => words[i + offset] === word),
    );
    if (match) {
      signs.push(...match.signs);
      i += match.words.length;
    } else {
      unsupported.push(words[i]);
      i++;
    }
  }
  if (unsupported.length)
    return fail(
      "Unsupported vocabulary. Nothing will play; unknown words are not skipped or replaced.",
      unsupported,
    );
  return {
    ok: true,
    plan: {
      text,
      language: catalog.language,
      signs,
      transitionSeconds: 0.25,
      mode,
    },
  };
}
export async function loadCatalog(signal: AbortSignal) {
  const response = await fetch("/signing/catalog.json", { signal });
  if (!response.ok)
    throw new Error("Signing catalog could not load. Please retry.");
  return validateCatalog(await response.json());
}
