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

function parseServingSizeG(servingSize: string | undefined): number | null {
  if (!servingSize) return null;
  const match = servingSize.match(/([\d.]+)\s*g/i);
  return match ? Number(match[1]) : null;
}

function mapProduct(product: any): OffFood | null {
  const n = product?.nutriments;
  if (!n || n['energy-kcal_100g'] == null) return null;

  return {
    barcode: product.code ?? null,
    name: product.product_name || product.generic_name || 'Unknown food',
    brand: product.brands ?? null,
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
  const url = `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(
    query
  )}&search_simple=1&action=process&json=1&page_size=20&fields=code,product_name,generic_name,brands,serving_size,nutriments`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Open Food Facts search failed');

  const data = await response.json();
  const products: any[] = data.products ?? [];
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
