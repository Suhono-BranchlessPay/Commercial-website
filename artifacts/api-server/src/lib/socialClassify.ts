/**
 * Blok 4.1 — HEURISTIC (keyword) classifier for inbound social messages.
 *
 * This is explicitly NOT machine learning and NOT a medical/legal judgment.
 * It exists only to route messages to the correct HUMAN workflow:
 *  - allergy_health and spam are NEVER auto-drafted or auto-sent.
 *  - complaint is drafted for review but NEVER auto-sent (owner alert only).
 * When in doubt, the classifier prefers the safer (more restrictive) bucket.
 */
import type { SocialClassification } from "@workspace/db";

const ALLERGY_HEALTH_KEYWORDS = [
  "allerg", // allergy, allergic, allergen
  "anaphyla",
  "epipen",
  "peanut",
  "tree nut",
  "shellfish",
  "gluten",
  "celiac",
  "coeliac",
  "lactose",
  "dairy free",
  "dairy-free",
  "halal",
  "kosher",
  "food poison",
  "foodborne",
  "threw up",
  "vomit",
  "diarrhea",
  "hospital",
  "er visit",
  "emergency room",
  "sick after eating",
  "got sick",
  "made me sick",
];

const SPAM_KEYWORDS = [
  "http://",
  "https://",
  "www.",
  "click here",
  "click the link",
  "buy now",
  "free followers",
  "free crypto",
  "bitcoin",
  "forex",
  "investment opportunity",
  "dm me for",
  "check my page",
  "check my profile",
  "work from home",
  "make money fast",
  "only fans",
  "onlyfans",
  "промо",
  "earn $",
  "guaranteed profit",
];

const COMPLAINT_KEYWORDS = [
  "worst",
  "terrible",
  "awful",
  "disgusting",
  "refund",
  "never again",
  "never coming back",
  "rude",
  "cold food",
  "was cold",
  "raw chicken",
  "undercooked",
  "overcooked",
  "waited an hour",
  "waited over",
  "hour late",
  "manager",
  "complain",
  "disappointed",
  "unacceptable",
  "horrible",
  "ripped off",
  "overcharged",
  "wrong order",
  "missing item",
  "hair in my food",
  "bug in my food",
];

const PRAISE_KEYWORDS = [
  "delicious",
  "amazing",
  "best",
  "love this",
  "loved it",
  "great food",
  "excellent",
  "yummy",
  "favorite",
  "favourite",
  "awesome",
  "thank you",
  "thanks so much",
  "so good",
  "highly recommend",
  "5 stars",
  "five stars",
];

const QUESTION_STARTERS = [
  "what",
  "when",
  "where",
  "how",
  "do you",
  "are you",
  "can i",
  "can you",
  "is there",
  "does the",
  "will you",
  "why",
];

export type ClassifyResult = {
  classification: SocialClassification;
  riskFlags: string[];
};

function normalize(text: string): string {
  return text.toLowerCase();
}

function findMatches(haystack: string, needles: string[], tag: string): string[] {
  const hits: string[] = [];
  for (const needle of needles) {
    if (haystack.includes(needle)) hits.push(`${tag}:${needle}`);
  }
  return hits;
}

/**
 * Priority order (safest first): allergy/health > spam > complaint > question
 * > praise > unknown. A message can technically match several buckets (e.g. a
 * spam link inside a complaint) — riskFlags records every hit even though
 * only the top-priority bucket becomes `classification`.
 */
export function classifySocialMessage(rawBody: string | null | undefined): ClassifyResult {
  const body = (rawBody ?? "").trim();
  if (!body) {
    return { classification: "unknown", riskFlags: ["empty_body"] };
  }
  const text = normalize(body);

  const allergyHits = findMatches(text, ALLERGY_HEALTH_KEYWORDS, "allergy_keyword");
  const spamHits = findMatches(text, SPAM_KEYWORDS, "spam_keyword");
  const complaintHits = findMatches(text, COMPLAINT_KEYWORDS, "complaint_keyword");
  const praiseHits = findMatches(text, PRAISE_KEYWORDS, "praise_keyword");
  const isQuestion =
    text.includes("?") || QUESTION_STARTERS.some((q) => text.startsWith(q));

  const allFlags = [...allergyHits, ...spamHits, ...complaintHits, ...praiseHits];

  if (allergyHits.length > 0) {
    return { classification: "allergy_health", riskFlags: allFlags };
  }
  if (spamHits.length > 0) {
    return { classification: "spam", riskFlags: allFlags };
  }
  if (complaintHits.length > 0) {
    return { classification: "complaint", riskFlags: allFlags };
  }
  if (isQuestion) {
    return {
      classification: "question",
      riskFlags: allFlags.length ? allFlags : ["question_pattern"],
    };
  }
  if (praiseHits.length > 0) {
    return { classification: "praise", riskFlags: allFlags };
  }
  return { classification: "unknown", riskFlags: allFlags };
}
