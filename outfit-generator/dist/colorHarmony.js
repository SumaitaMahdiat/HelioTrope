/** Simple color families for harmony scoring (rule-based, not perceptual lab). */
const WARM = new Set([
    "red",
    "orange",
    "yellow",
    "gold",
    "terracotta",
    "brown",
    "camel",
    "burgundy",
]);
const COOL = new Set([
    "blue",
    "navy",
    "teal",
    "green",
    "mint",
    "purple",
    "lavender",
]);
const NEUTRAL = new Set([
    "black",
    "white",
    "grey",
    "gray",
    "cream",
    "beige",
    "tan",
    "khaki",
    "ivory",
    "charcoal",
]);
function family(color) {
    const c = color.toLowerCase().trim();
    if (NEUTRAL.has(c))
        return "neutral";
    if (WARM.has(c))
        return "warm";
    if (COOL.has(c))
        return "cool";
    return "other";
}
/** Returns 0–1 harmony score for a set of garment colors. */
export function colorHarmonyScore(colors) {
    if (colors.length <= 1)
        return 1;
    const families = colors.map(family);
    const neutrals = families.filter((f) => f === "neutral").length;
    const nonNeutral = families.filter((f) => f !== "neutral" && f !== "other");
    if (nonNeutral.length <= 1)
        return 0.85 + neutrals * 0.02;
    const warmCount = nonNeutral.filter((f) => f === "warm").length;
    const coolCount = nonNeutral.filter((f) => f === "cool").length;
    if (warmCount > 0 && coolCount > 0)
        return 0.55;
    const uniq = new Set(nonNeutral);
    if (uniq.size === 1)
        return 0.9;
    return 0.72;
}
export function harmonyNote(colors) {
    const score = colorHarmonyScore(colors);
    if (score >= 0.85)
        return "Colors read cohesive (neutrals or same family).";
    if (score >= 0.7)
        return "Moderate harmony; consider swapping one accent for a neutral.";
    return "Mixed warm/cool accents—try anchoring with black, white, or beige.";
}
