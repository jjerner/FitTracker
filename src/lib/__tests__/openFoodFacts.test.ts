import { searchByName } from '../openFoodFacts';

const nutella = {
  code: '3017620422003',
  product_name: 'Nutella',
  brands: ['Ferrero', 'Nutella'],
  serving_size: '15 g',
  nutriments: {
    'energy-kcal_100g': 539,
    proteins_100g: 6.3,
    carbohydrates_100g: 57.5,
    fat_100g: 30.9,
    sugars_100g: 56.3,
    sodium_100g: 0.0428,
  },
};

function mockFetch(body: unknown, ok = true) {
  const fetchMock = jest.fn().mockResolvedValue({ ok, json: async () => body });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('searchByName', () => {
  it('queries the search service with the same fields and page size', async () => {
    const fetchMock = mockFetch({ hits: [] });
    await searchByName('peanut butter');

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://search.openfoodfacts.org/search');
    expect(url.searchParams.get('q')).toBe('peanut butter');
    expect(url.searchParams.get('page_size')).toBe('20');
    expect(url.searchParams.get('fields')).toBe(
      'code,product_name,generic_name,brands,serving_size,nutriments'
    );
  });

  it('escapes Lucene operators so the text is searched literally', async () => {
    const fetchMock = mockFetch({ hits: [] });
    await searchByName(' coca-cola: zero! ');

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('q')).toBe('coca\\-cola\\: zero\\!');
  });

  it('maps hits to foods', async () => {
    mockFetch({ hits: [nutella] });
    expect(await searchByName('nutella')).toEqual([
      {
        barcode: '3017620422003',
        name: 'Nutella',
        brand: 'Ferrero, Nutella',
        servingSizeG: 15,
        servingDescription: '15 g',
        caloriesKcal: 539,
        proteinG: 6.3,
        carbsG: 57.5,
        fatG: 30.9,
        fiberG: null,
        sugarG: 56.3,
        sodiumMg: 42.8,
      },
    ]);
  });

  it('keeps string brands and drops empty ones', async () => {
    mockFetch({
      hits: [
        { ...nutella, brands: 'Ferrero' },
        { ...nutella, brands: [] },
      ],
    });
    const [a, b] = await searchByName('nutella');
    expect(a.brand).toBe('Ferrero');
    expect(b.brand).toBeNull();
  });

  it('skips hits without calories and falls back on the name', async () => {
    mockFetch({
      hits: [
        { ...nutella, nutriments: {} },
        { ...nutella, product_name: '', generic_name: 'Hazelnut spread' },
        { ...nutella, product_name: undefined, generic_name: undefined },
      ],
    });
    const names = (await searchByName('spread')).map((f) => f.name);
    expect(names).toEqual(['Hazelnut spread', 'Unknown food']);
  });

  it('throws on an HTTP failure or an error response', async () => {
    mockFetch({}, false);
    await expect(searchByName('x')).rejects.toThrow('Open Food Facts search failed');

    mockFetch({ errors: [{ title: 'QueryParseError' }] });
    await expect(searchByName('x')).rejects.toThrow('Open Food Facts search failed');
  });
});
