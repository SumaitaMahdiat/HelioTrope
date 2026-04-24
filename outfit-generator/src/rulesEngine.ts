import { colorHarmonyScore, harmonyNote } from "./colorHarmony.js";
import type {
  ClosetItemInput,
  GeneratedOutfit,
  OccasionTag,
  OutfitStyle,
} from "./types.js";

function byCategory(items: ClosetItemInput[], cat: string) {
  return items.filter((i) => i.category === cat);
}

function normalizeColor(color: string): string {
  return color.toLowerCase().trim();
}

function occasionMatch(item: ClosetItemInput, occasion?: OccasionTag): number {
  if (!occasion) return 0;
  if (!item.occasions?.length) return 0;
  return item.occasions.includes(occasion) ? 1 : -0.5;
}

function cluelessStyleBonus(outfit: ClosetItemInput[]): {
  score: number;
  notes: string[];
} {
  let score = 0;
  const notes: string[] = [];

  const top = outfit.find((i) => i.category === "top");
  const bottom = outfit.find((i) => i.category === "bottom");
  const outerwear = outfit.find((i) => i.category === "outerwear");
  const shoes = outfit.find((i) => i.category === "shoes");
  const bag = outfit.find((i) => i.category === "bag");
  const accessories = outfit.filter((i) => i.category === "accessories");

  if (top && bottom) {
    const topColor = normalizeColor(top.color);
    const bottomColor = normalizeColor(bottom.color);
    if (topColor === bottomColor) {
      score += 16;
      notes.push("Clueless mode: coordinated top/bottom set.");
    } else {
      score += 7;
      notes.push("Clueless mode: mixed top/bottom pairing.");
    }
  }

  if (outerwear) {
    score += 8;
    notes.push("Layering boost: outerwear creates a polished finish.");
  }

  if (shoes) {
    score += 8;
  } else {
    score -= 12;
    notes.push("Missing shoes for a complete look.");
  }

  if (bag) {
    score += 5;
  }

  if (accessories.length > 0) {
    score += 4;
  }

  return { score, notes };
}

/**
 * Builds candidate outfits: (dress or top+bottom) + optional outerwear + shoes + one accessory/bag/glasses.
 */
export function generateOutfitCombinations(
  closet: ClosetItemInput[],
  occasion?: OccasionTag,
  maxOutfits = 12,
  style: OutfitStyle = "classic",
): GeneratedOutfit[] {
  const tops = byCategory(closet, "top");
  const bottoms = byCategory(closet, "bottom");
  const dresses = byCategory(closet, "dress");
  const outer = byCategory(closet, "outerwear");
  const shoes = byCategory(closet, "shoes");
  const accessories = byCategory(closet, "accessories");
  const bags = byCategory(closet, "bag");
  const glasses = byCategory(closet, "glasses");
  const extras = [...accessories, ...bags, ...glasses];

  const results: GeneratedOutfit[] = [];

  const baseSets: ClosetItemInput[][] = [];

  for (const d of dresses) {
    baseSets.push([d]);
  }
  for (const t of tops) {
    for (const b of bottoms) {
      baseSets.push([t, b]);
    }
  }

  for (const base of baseSets) {
    const withOuter: ClosetItemInput[][] = outer.length
      ? outer.map((o) => [...base, o])
      : [base];
    for (const row of withOuter) {
      const withShoes: ClosetItemInput[][] = shoes.length
        ? shoes.map((s) => [...row, s])
        : [row];
      for (const outfit of withShoes) {
        const withExtra: ClosetItemInput[][] = extras.length
          ? extras.map((e) => [...outfit, e])
          : [outfit];
        for (const full of withExtra) {
          const colors = full.map((i) => i.color);
          let score = colorHarmonyScore(colors) * 40;
          const notes: string[] = [harmonyNote(colors)];

          if (occasion) {
            let occ = 0;
            for (const it of full) occ += occasionMatch(it, occasion);
            score += occ * 8;
            if (occ > 0)
              notes.push(`Occasion "${occasion}" aligned with tagged items.`);
          }

          const hasDress = full.some((i) => i.category === "dress");
          const hasTopBottom =
            full.some((i) => i.category === "top") &&
            full.some((i) => i.category === "bottom");
          if (hasDress || hasTopBottom) {
            score += 15;
            notes.push("Structure: core coverage (dress or top+bottom).");
          } else {
            score -= 20;
            notes.push("Incomplete core—add a dress or top+bottom.");
          }

          if (style === "clueless") {
            const boost = cluelessStyleBonus(full);
            score += boost.score;
            notes.push(...boost.notes);

            const neutralCount = full.filter((i) =>
              [
                "black",
                "white",
                "beige",
                "cream",
                "tan",
                "navy",
                "gray",
                "grey",
              ].includes(normalizeColor(i.color)),
            ).length;
            if (neutralCount >= 2) {
              score += 6;
              notes.push(
                "Neutral anchor palette keeps the outfit preppy and clean.",
              );
            }
          }

          results.push({ items: full, score, ruleNotes: notes });
        }
      }
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, maxOutfits);
}
