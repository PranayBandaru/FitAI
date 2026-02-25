import Constants from "expo-constants";

const USDA_API_KEY =
  (Constants.expoConfig?.extra?.usdaApiKey as string) ||
  process.env.EXPO_PUBLIC_USDA_API_KEY ||
  "DEMO_KEY";

const BASE_URL = "https://api.nal.usda.gov/fdc/v1";

interface NutritionPer100g {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

interface USDAFood {
  fdcId: number;
  description: string;
  nutritionPer100g: NutritionPer100g;
}

function extractNutrient(nutrients: any[], name: string): number {
  // USDA /foods/search returns either `nutrientName` or `name` depending on food type
  const getName = (n: any): string =>
    (n.nutrientName ?? n.name ?? "").toLowerCase();

  // Prefer an exact kcal match for energy to avoid picking up the kJ duplicate
  if (name === "energy") {
    const kcal = nutrients.find(
      (n: any) =>
        getName(n).includes("energy") &&
        (n.unitName?.toUpperCase() === "KCAL" || n.nutrientNumber === "208"),
    );
    if (kcal) return kcal.value ?? 0;
  }
  const n = nutrients.find((n: any) => getName(n).includes(name.toLowerCase()));
  return n?.value ?? 0;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchFood(query: string): Promise<USDAFood | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/foods/search?query=${encodeURIComponent(query)}&pageSize=1&api_key=${USDA_API_KEY}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const food = data.foods?.[0];
    if (!food) return null;

    const nutrients: any[] = food.foodNutrients ?? [];
    const result = {
      fdcId: food.fdcId,
      description: food.description,
      nutritionPer100g: {
        calories_kcal: extractNutrient(nutrients, "energy"),
        protein_g: extractNutrient(nutrients, "protein"),
        carbs_g: extractNutrient(nutrients, "carbohydrate"),
        fat_g: extractNutrient(nutrients, "total lipid"),
        fiber_g: extractNutrient(nutrients, "fiber"),
      },
    };
    console.log(
      `[USDA] "${query}" → "${food.description}" (fdcId ${food.fdcId})`,
      result.nutritionPer100g,
    );
    return result;
  } catch (e) {
    console.warn("[USDA] searchFood error", e);
    return null;
  }
}

// ─── Unit → grams conversion ──────────────────────────────────────────────────

const UNIT_TO_GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  oz: 28.35,
  ounce: 28.35,
  ounces: 28.35,
  lb: 453.6,
  lbs: 453.6,
  cup: 240,
  cups: 240,
  tbsp: 15,
  tablespoon: 15,
  tablespoons: 15,
  tsp: 5,
  teaspoon: 5,
  teaspoons: 5,
  ml: 1,
  l: 1000,
  // whole-item defaults
  piece: 100,
  pieces: 100,
  slice: 30,
  slices: 30,
  serving: 100,
  servings: 100,
  link: 50, // sausage link ≈ 50g
  links: 50,
  strip: 12, // bacon strip ≈ 12g cooked
  strips: 12,
  egg: 50, // medium egg
  eggs: 50,
  clove: 5, // garlic clove
  cloves: 5,
  handful: 30,
  handfuls: 30,
};

export function unitToGrams(quantity: number, unit: string): number {
  const factor = UNIT_TO_GRAMS[unit.toLowerCase()] ?? 100;
  return (Number(quantity) || 1) * factor;
}

// ─── Resolve a list of parsed food items to nutrition data ────────────────────

export interface ParsedFoodItem {
  food_name: string;
  quantity: number;
  unit: string;
}

export interface ResolvedFoodItem extends ParsedFoodItem {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  source: "usda" | "llm_estimate";
}

export async function resolveNutrition(
  items: ParsedFoodItem[],
  llmFallback: (item: ParsedFoodItem) => Promise<ResolvedFoodItem>,
): Promise<ResolvedFoodItem[]> {
  const results = await Promise.all(
    items.map(async (item): Promise<ResolvedFoodItem> => {
      const usdaFood = await searchFood(item.food_name);
      if (usdaFood) {
        const grams = unitToGrams(item.quantity, item.unit);
        const factor = grams / 100;
        return {
          ...item,
          quantity: Number(item.quantity) || 1,
          calories_kcal: Math.round(
            (usdaFood.nutritionPer100g.calories_kcal || 0) * factor,
          ),
          protein_g: parseFloat(
            ((usdaFood.nutritionPer100g.protein_g || 0) * factor).toFixed(1),
          ),
          carbs_g: parseFloat(
            ((usdaFood.nutritionPer100g.carbs_g || 0) * factor).toFixed(1),
          ),
          fat_g: parseFloat(
            ((usdaFood.nutritionPer100g.fat_g || 0) * factor).toFixed(1),
          ),
          fiber_g: parseFloat(
            ((usdaFood.nutritionPer100g.fiber_g || 0) * factor).toFixed(1),
          ),
          source: "usda",
        };
      }
      // Fallback to LLM estimation
      return llmFallback(item);
    }),
  );
  return results;
}
