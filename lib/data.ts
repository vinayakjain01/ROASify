// ROASify Product Data

export type Quadrant = 'champions' | 'contenders' | 'cruisers' | 'casualties';
export type Category = 'Apparel' | 'Beauty' | 'Home' | 'Accessories';

export interface Product {
  id: string;
  title: string;
  variant: string;
  category: Category;
  quadrant: Quadrant;
  discounted: boolean;
  metaSpend: number;
  googleCost: number;
  totalSpend: number;
  revenue: number;
  roi: number;
  itemsSold: number;
  ctr: number;
  cpm: number;
}

export const products: Product[] = [
  // Champions (4) - High revenue, low spend
  {
    id: 'TKR-441',
    title: 'Linen Oversized Shirt',
    variant: 'Ecru',
    category: 'Apparel',
    quadrant: 'champions',
    discounted: false,
    metaSpend: 28200,
    googleCost: 8933,
    totalSpend: 37133,
    revenue: 992000,
    roi: 26.7,
    itemsSold: 486,
    ctr: 3.8,
    cpm: 142
  },
  {
    id: 'AYU-007',
    title: 'Kumkumadi Face Serum',
    variant: '15ml',
    category: 'Beauty',
    quadrant: 'champions',
    discounted: false,
    metaSpend: 35800,
    googleCost: 11410,
    totalSpend: 47210,
    revenue: 1184000,
    roi: 25.1,
    itemsSold: 1240,
    ctr: 4.2,
    cpm: 128
  },
  {
    id: 'HMS-219',
    title: 'Hand-Block Quilt',
    variant: 'King',
    category: 'Home',
    quadrant: 'champions',
    discounted: false,
    metaSpend: 46400,
    googleCost: 14800,
    totalSpend: 61200,
    revenue: 1388000,
    roi: 22.7,
    itemsSold: 118,
    ctr: 3.4,
    cpm: 156
  },
  {
    id: 'TKR-128',
    title: 'Cotton Pyjama Set',
    variant: 'Slate',
    category: 'Apparel',
    quadrant: 'champions',
    discounted: false,
    metaSpend: 16500,
    googleCost: 5200,
    totalSpend: 21700,
    revenue: 412500,
    roi: 19.0,
    itemsSold: 285,
    ctr: 3.6,
    cpm: 135
  },

  // Contenders (8) - High revenue, high spend
  {
    id: 'AYU-014',
    title: 'Rosewater Facial Mist',
    variant: '200ml',
    category: 'Beauty',
    quadrant: 'contenders',
    discounted: false,
    metaSpend: 185200,
    googleCost: 59000,
    totalSpend: 244200,
    revenue: 2104000,
    roi: 8.6,
    itemsSold: 2890,
    ctr: 2.9,
    cpm: 168
  },
  {
    id: 'TKR-302',
    title: 'Wide-Leg Linen Trouser',
    variant: 'Natural',
    category: 'Apparel',
    quadrant: 'contenders',
    discounted: true,
    metaSpend: 136800,
    googleCost: 43600,
    totalSpend: 180400,
    revenue: 1842000,
    roi: 10.2,
    itemsSold: 1420,
    ctr: 3.1,
    cpm: 154
  },
  {
    id: 'AYU-101',
    title: 'Sandalwood Body Oil',
    variant: '100ml',
    category: 'Beauty',
    quadrant: 'contenders',
    discounted: true,
    metaSpend: 118700,
    googleCost: 37800,
    totalSpend: 156500,
    revenue: 1488000,
    roi: 9.5,
    itemsSold: 1680,
    ctr: 2.8,
    cpm: 172
  },
  {
    id: 'HMS-411',
    title: 'Brass Diya Set',
    variant: 'Set of 4',
    category: 'Home',
    quadrant: 'contenders',
    discounted: true,
    metaSpend: 108000,
    googleCost: 34400,
    totalSpend: 142400,
    revenue: 1322000,
    roi: 9.3,
    itemsSold: 892,
    ctr: 2.6,
    cpm: 182
  },
  {
    id: 'TKR-559',
    title: 'Khadi Kurta',
    variant: 'Indigo',
    category: 'Apparel',
    quadrant: 'contenders',
    discounted: true,
    metaSpend: 94300,
    googleCost: 30100,
    totalSpend: 124400,
    revenue: 1124000,
    roi: 9.0,
    itemsSold: 748,
    ctr: 2.7,
    cpm: 176
  },
  {
    id: 'ACC-200',
    title: 'Leather Card Holder',
    variant: 'Tan',
    category: 'Accessories',
    quadrant: 'contenders',
    discounted: false,
    metaSpend: 82900,
    googleCost: 26500,
    totalSpend: 109400,
    revenue: 982000,
    roi: 9.0,
    itemsSold: 1240,
    ctr: 3.2,
    cpm: 148
  },
  {
    id: 'HMS-088',
    title: 'Stoneware Dinner Plate',
    variant: 'Speckled White',
    category: 'Home',
    quadrant: 'contenders',
    discounted: false,
    metaSpend: 21100,
    googleCost: 6800,
    totalSpend: 27900,
    revenue: 514000,
    roi: 18.4,
    itemsSold: 680,
    ctr: 3.5,
    cpm: 138
  },
  {
    id: 'AYU-052',
    title: 'Ubtan Cleansing Powder',
    variant: '75g',
    category: 'Beauty',
    quadrant: 'contenders',
    discounted: false,
    metaSpend: 11800,
    googleCost: 3800,
    totalSpend: 15600,
    revenue: 298500,
    roi: 19.1,
    itemsSold: 420,
    ctr: 3.9,
    cpm: 124
  },

  // Cruisers (9) - Low revenue, low spend
  {
    id: 'TKR-664',
    title: 'Cotton Scarf',
    variant: 'Block Print',
    category: 'Apparel',
    quadrant: 'cruisers',
    discounted: true,
    metaSpend: 8200,
    googleCost: 2600,
    totalSpend: 10800,
    revenue: 38800,
    roi: 3.6,
    itemsSold: 86,
    ctr: 1.8,
    cpm: 245
  },
  {
    id: 'AYU-088',
    title: 'Coconut Hair Mask',
    variant: '150g',
    category: 'Beauty',
    quadrant: 'cruisers',
    discounted: false,
    metaSpend: 12400,
    googleCost: 3900,
    totalSpend: 16300,
    revenue: 58600,
    roi: 3.6,
    itemsSold: 124,
    ctr: 1.9,
    cpm: 238
  },
  {
    id: 'HMS-302',
    title: 'Ceramic Vase',
    variant: 'Small Blue',
    category: 'Home',
    quadrant: 'cruisers',
    discounted: false,
    metaSpend: 16800,
    googleCost: 5400,
    totalSpend: 22200,
    revenue: 78600,
    roi: 3.5,
    itemsSold: 64,
    ctr: 1.7,
    cpm: 256
  },
  {
    id: 'ACC-118',
    title: 'Woven Belt',
    variant: 'Brown',
    category: 'Accessories',
    quadrant: 'cruisers',
    discounted: true,
    metaSpend: 4800,
    googleCost: 1500,
    totalSpend: 6300,
    revenue: 24200,
    roi: 3.8,
    itemsSold: 42,
    ctr: 2.0,
    cpm: 232
  },
  {
    id: 'HMS-188',
    title: 'Jute Coasters',
    variant: 'Set of 6',
    category: 'Home',
    quadrant: 'cruisers',
    discounted: false,
    metaSpend: 5600,
    googleCost: 1800,
    totalSpend: 7400,
    revenue: 28800,
    roi: 3.9,
    itemsSold: 98,
    ctr: 2.1,
    cpm: 228
  },
  {
    id: 'TKR-712',
    title: 'Muslin Dupatta',
    variant: 'Ivory',
    category: 'Apparel',
    quadrant: 'cruisers',
    discounted: false,
    metaSpend: 14200,
    googleCost: 4500,
    totalSpend: 18700,
    revenue: 63600,
    roi: 3.4,
    itemsSold: 72,
    ctr: 1.6,
    cpm: 262
  },
  {
    id: 'AYU-201',
    title: 'Neem Face Wash',
    variant: '100ml',
    category: 'Beauty',
    quadrant: 'cruisers',
    discounted: true,
    metaSpend: 9800,
    googleCost: 3100,
    totalSpend: 12900,
    revenue: 48400,
    roi: 3.8,
    itemsSold: 156,
    ctr: 1.9,
    cpm: 242
  },
  {
    id: 'ACC-244',
    title: 'Silk Pocket Square',
    variant: 'Paisley',
    category: 'Accessories',
    quadrant: 'cruisers',
    discounted: false,
    metaSpend: 10600,
    googleCost: 3400,
    totalSpend: 14000,
    revenue: 52800,
    roi: 3.8,
    itemsSold: 88,
    ctr: 2.0,
    cpm: 235
  },
  {
    id: 'HMS-156',
    title: 'Cotton Napkins',
    variant: 'Set of 4',
    category: 'Home',
    quadrant: 'cruisers',
    discounted: false,
    metaSpend: 6200,
    googleCost: 2000,
    totalSpend: 8200,
    revenue: 31200,
    roi: 3.8,
    itemsSold: 52,
    ctr: 1.8,
    cpm: 248
  },

  // Casualties (5) - High spend, low revenue
  {
    id: 'TKR-998',
    title: 'Velvet Blazer',
    variant: 'Midnight',
    category: 'Apparel',
    quadrant: 'casualties',
    discounted: true,
    metaSpend: 174800,
    googleCost: 55600,
    totalSpend: 230400,
    revenue: 328000,
    roi: 1.4,
    itemsSold: 28,
    ctr: 0.8,
    cpm: 385
  },
  {
    id: 'AYU-302',
    title: 'Anti-Aging Night Cream',
    variant: '50g',
    category: 'Beauty',
    quadrant: 'casualties',
    discounted: true,
    metaSpend: 137100,
    googleCost: 43700,
    totalSpend: 180800,
    revenue: 286000,
    roi: 1.6,
    itemsSold: 86,
    ctr: 0.9,
    cpm: 368
  },
  {
    id: 'ACC-411',
    title: 'Designer Tote',
    variant: 'Black',
    category: 'Accessories',
    quadrant: 'casualties',
    discounted: true,
    metaSpend: 152000,
    googleCost: 48400,
    totalSpend: 200400,
    revenue: 412000,
    roi: 2.1,
    itemsSold: 42,
    ctr: 1.0,
    cpm: 356
  },
  {
    id: 'HMS-505',
    title: 'Marble Lazy Susan',
    variant: 'White',
    category: 'Home',
    quadrant: 'casualties',
    discounted: true,
    metaSpend: 103600,
    googleCost: 33000,
    totalSpend: 136600,
    revenue: 184000,
    roi: 1.3,
    itemsSold: 18,
    ctr: 0.7,
    cpm: 398
  },
  {
    id: 'AYU-411',
    title: 'Vitamin C Booster',
    variant: '30ml',
    category: 'Beauty',
    quadrant: 'casualties',
    discounted: false,
    metaSpend: 83100,
    googleCost: 26500,
    totalSpend: 109600,
    revenue: 198000,
    roi: 1.8,
    itemsSold: 124,
    ctr: 1.1,
    cpm: 342
  }
];

// Calculate aggregates
export const totalProducts = products.length;
export const totalMetaSpend = products.reduce((sum, p) => sum + p.metaSpend, 0);
export const totalGoogleCost = products.reduce((sum, p) => sum + p.googleCost, 0);
export const totalSpend = products.reduce((sum, p) => sum + p.totalSpend, 0);
export const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);
export const overallRoi = totalRevenue / totalSpend;
export const totalItemsSold = products.reduce((sum, p) => sum + p.itemsSold, 0);

// Quadrant aggregates
export const getQuadrantData = (quadrant: Quadrant) => {
  const quadrantProducts = products.filter(p => p.quadrant === quadrant);
  const spend = quadrantProducts.reduce((sum, p) => sum + p.totalSpend, 0);
  const revenue = quadrantProducts.reduce((sum, p) => sum + p.revenue, 0);
  return {
    products: quadrantProducts,
    count: quadrantProducts.length,
    spend,
    revenue,
    roi: revenue / spend
  };
};

// Discount aggregates
export const discountedProducts = products.filter(p => p.discounted);
export const nonDiscountedProducts = products.filter(p => !p.discounted);

export const discountedStats = {
  count: discountedProducts.length,
  spend: discountedProducts.reduce((sum, p) => sum + p.totalSpend, 0),
  revenue: discountedProducts.reduce((sum, p) => sum + p.revenue, 0),
  items: discountedProducts.reduce((sum, p) => sum + p.itemsSold, 0),
  avgCtr: discountedProducts.reduce((sum, p) => sum + p.ctr, 0) / discountedProducts.length,
  avgCpm: discountedProducts.reduce((sum, p) => sum + p.cpm, 0) / discountedProducts.length
};
discountedStats.roi = discountedStats.revenue / discountedStats.spend;

export const nonDiscountedStats = {
  count: nonDiscountedProducts.length,
  spend: nonDiscountedProducts.reduce((sum, p) => sum + p.totalSpend, 0),
  revenue: nonDiscountedProducts.reduce((sum, p) => sum + p.revenue, 0),
  items: nonDiscountedProducts.reduce((sum, p) => sum + p.itemsSold, 0),
  avgCtr: nonDiscountedProducts.reduce((sum, p) => sum + p.ctr, 0) / nonDiscountedProducts.length,
  avgCpm: nonDiscountedProducts.reduce((sum, p) => sum + p.cpm, 0) / nonDiscountedProducts.length
};
nonDiscountedStats.roi = nonDiscountedStats.revenue / nonDiscountedStats.spend;

// Top performers (highest ROI)
export const topPerformers = [...products].sort((a, b) => b.roi - a.roi).slice(0, 3);

// Run metadata
export const runMetadata = {
  runId: 'pa_2026_05_22_14_07',
  period: 'Apr 22 – May 21, 2026',
  sources: [
    { name: 'Meta Ads', rows: 87, file: 'meta_ads_apr_may.csv', size: '142 KB' },
    { name: 'Shopify', rows: 92, file: 'shopify_orders_apr_may.csv', size: '186 KB' },
    { name: 'Google Ads', rows: 73, file: 'google_ads_apr_may.csv', size: '98 KB' }
  ]
};
