// utils/profanityFilter.ts
import leoProfanity from "leo-profanity";

// Initialize and load dictionary once
leoProfanity.loadDictionary("en");

export function containsProfanity(text: string): boolean {
  return leoProfanity.check(text);
}

export function cleanProfanity(text: string): string {
  return leoProfanity.clean(text);
}
