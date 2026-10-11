export type OffFood = {
  barcode: string | null;
  name: string;
  brand: string | null;
  servingSizeG: number | null;
  servingDescription: string | null;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
};

const BASE_URL = 'https://world.openfoodfacts.org';
// Search-a-licious, the newer Open Food Facts search service.
const SEARCH_URL = 'https://search.openfoodfacts.org/search';
// Names come back per language: product_name is the product's main language,
// product_name_<lang> the others. Match Swedish and English names, like the old
// search that matched every language.
const SEARCH_LANGS = ['sv', 'en'];
const NAME_FIELDS = ['product_name', 'generic_name'];
const SEARCH_FIELDS = [
  'code',
  ...NAME_FIELDS.flatMap((f) => [f, ...SEARCH_LANGS.map((l) => `${f}_${l}`)]),
  'brands',
  'serving_size',
  'nutriments',
].join(',');

function parseServingSizeG(servingSize: string | undefined): number | null {
  if (!servingSize) return null;
  const match = servingSize.match(/([\d.]+)\s*g/i);
  return match ? Number(match[1]) : null;
}

// The product API returns brands as a comma-separated string; the search
// service may return them as a list.
function parseBrands(brands: unknown): string | null {
  if (Array.isArray(brands)) return brands.length > 0 ? brands.join(', ') : null;
  return typeof brands === 'string' && brands !== '' ? brands : null;
}

// The search service parses q as Lucene, so escape its operators to search the
// typed text literally, like the old full-text search did. Lowercasing keeps
// AND/OR/NOT from acting as operators; matching ignores case anyway.
function escapeLucene(text: string): string {
  return text.toLowerCase().replace(/[+\-!(){}[\]^"~*?:\\/&|]/g, '\\$&');
}

// First non-empty name, main language first, then the search languages.
function pickName(product: any): string {
  for (const field of NAME_FIELDS) {
    for (const key of [field, ...SEARCH_LANGS.map((l) => `${field}_${l}`)]) {
      const value = product[key];
      if (typeof value === 'string' && value.trim() !== '') return value;
    }
  }
  return 'Unknown food';
}

function mapProduct(product: any): OffFood | null {
  const n = product?.nutriments;
  if (!n || n['energy-kcal_100g'] == null) return null;

  return {
    barcode: product.code ?? null,
    name: pickName(product),
    brand: parseBrands(product.brands),
    servingSizeG: parseServingSizeG(product.serving_size),
    servingDescription: product.serving_size ?? null,
    caloriesKcal: n['energy-kcal_100g'],
    proteinG: n['proteins_100g'] ?? 0,
    carbsG: n['carbohydrates_100g'] ?? 0,
    fatG: n['fat_100g'] ?? 0,
    fiberG: n['fiber_100g'] ?? null,
    sugarG: n['sugars_100g'] ?? null,
    sodiumMg: n['sodium_100g'] != null ? n['sodium_100g'] * 1000 : null,
  };
}

export async function searchByName(query: string): Promise<OffFood[]> {
  const url = `${SEARCH_URL}?q=${encodeURIComponent(
    escapeLucene(query.trim())
  )}&langs=${SEARCH_LANGS.join(',')}&page_size=20&fields=${SEARCH_FIELDS}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Open Food Facts search failed');

  const data = await response.json();
  if (data.errors?.length) throw new Error('Open Food Facts search failed');
  const products: any[] = data.hits ?? [];
  return products.map(mapProduct).filter((f): f is OffFood => f !== null);
}

export async function getByBarcode(barcode: string): Promise<OffFood | null> {
  const url = `${BASE_URL}/api/v2/product/${encodeURIComponent(barcode)}.json`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Open Food Facts lookup failed');

  const data = await response.json();
  if (data.status !== 1 || !data.product) return null;

  return mapProduct(data.product);
}
