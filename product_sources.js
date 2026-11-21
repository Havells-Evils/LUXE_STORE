/* =========================================================
   🎨 THEME SOURCES MANAGER
   ========================================================= */

const THEME_SOURCES = {
  1: {
    files: ['beauty.json'],
    dataTheme: 'beauty',
    name: 'Beauty Collection',
    title: 'The Beauty Collection',
    subtitle: 'Discover our exclusive range of premium beauty products curated for the discerning client',
    brandSub: 'Jaiswal Beauty Hub',
    footerDesc: 'Jaiswal Beauty Hub — Where luxury meets beauty.',
    gradients: [['#fff5eb', '#ffd8b1'], ['#fce4ec', '#f8bbd0'], ['#f7e7ce', '#e8c4c4']]
  },
  2: {
    files: ['gym.json'],
    dataTheme: 'gym',
    name: 'Gym Collection',
    title: 'The Fitness Collection',
    subtitle: 'Premium fitness gear and supplements engineered for peak performance',
    brandSub: 'Jaiswal Fitness Hub',
    footerDesc: 'Jaiswal Fitness Hub — Built for athletes.',
    gradients: [['#fff3e0', '#ffccbc'], ['#ffebee', '#ffcdd2'], ['#fff8e1', '#ffe082']]
  },
  3: {
    files: ['food.json'],
    dataTheme: 'food',
    name: 'Food Collection',
    title: 'The Gourmet Collection',
    subtitle: 'Savor chef-crafted flavors delivered fresh from our kitchen to your table',
    brandSub: 'Jaiswal Food Hub',
    footerDesc: 'Jaiswal Food Hub — Where flavor meets freshness.',
    gradients: [['#fff3e0', '#ffcc80'], ['#ffebee', '#ef9a9a'], ['#f1f8e9', '#c5e1a5']]
  },
  4: {
    files: ['clothing.json'],
    dataTheme: 'clothing',
    name: 'Clothing & Shoes',
    title: 'The Fashion Collection',
    subtitle: 'Timeless silhouettes and crafted footwear for the modern wardrobe',
    brandSub: 'Jaiswal Fashion Hub',
    footerDesc: 'Jaiswal Fashion Hub — Timeless fashion, carefully crafted.',
    gradients: [['#eceff1', '#cfd8dc'], ['#fafafa', '#e0e0e0'], ['#efebe9', '#d7ccc8']]
  },
  5: {
    files: ['hamper.json'],
    dataTheme: 'hamper',
    name: 'Hamper Collection',
    title: 'The Gift Collection',
    subtitle: "Thoughtfully curated hampers for life's most special moments",
    brandSub: 'Jaiswal Gift Hub',
    footerDesc: 'Jaiswal Gift Hub — Thoughtfully curated gift hampers.',
    gradients: [['#fff8e1', '#ffe082'], ['#fce4ec', '#f8bbd0'], ['#f3e5f5', '#ce93d8']]
  }
};

function getAllSourceFiles() {
  return Object.values(THEME_SOURCES).flatMap(t => t.files || []);
}

function makeEmojiImage(emoji, gradient) {
  const [c1, c2] = gradient;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
    </linearGradient></defs>
    <rect width="400" height="400" fill="url(#g)"/>
    <text x="200" y="200" font-family="Apple Color Emoji, Segoe UI Emoji, sans-serif" font-size="180" text-anchor="middle" dominant-baseline="central">${emoji}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/* =========================================================
   NORMALIZE PRODUCT (Adapts your JSON to the UI)
   ========================================================= */
function normalizeProduct(p, sourceFile, index, config) {
  const gradients = (config && config.gradients) || [['#f5f5f5', '#e0e0e0']];

  // Image handling: Use your image path, fallback to emoji, then placeholder
  let images = (Array.isArray(p.images) ? p.images : []).filter(Boolean);
  if (!images.length) {
    if (p.image && String(p.image).trim() !== "") {
      images = [p.image];
    } else if (p.emoji) {
      images = gradients.map(g => makeEmojiImage(p.emoji, g));
    } else {
      images = ['https://placehold.co/400x400?text=No+Image'];
    }
  }

  // Feature handling: Use provided features, otherwise generate from brand/availability
  let features = [];
  if (Array.isArray(p.features) && p.features.length) {
    features = [...new Set(p.features)];
  } else {
    if (p.brand) features.push(`Brand: ${p.brand}`);
    if (p.availability) features.push(p.availability);
    if (p.rating) features.push(`⭐ ${p.rating} Rating`);
  }

  // Discount handling: Convert "17" to "17% Off"
  let discountStr = p.discount;
  if (p.discount && !String(p.discount).includes('%')) {
    discountStr = `${p.discount}% Off`;
  }

  return {
    ...p,
    id: (p.id !== undefined) ? p.id : `${sourceFile}-${index}`,
    category: p.category || p.brand || 'General',
    badge: p.badge || (Number(p.rating) >= 4.5 ? 'Top Rated' : ''),
    features: features,
    discount: discountStr,
    images: images,
    image: images[0],
    link: p.link || p.affiliate_link || '#',
    _source: sourceFile
  };
}

async function loadSource(file) {
  try {
    const res = await fetch(file, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.products)) return data.products;
    throw new Error('Invalid format');
  } catch (error) {
    console.warn(`⚠️ Could not load "${file}":`, error.message);
    return []; // Return empty array so other files can still load
  }
}

async function fetchThemeProducts(themeNum) {
  const config = THEME_SOURCES[themeNum];
  if (!config) throw new Error(`Theme ${themeNum} not found`);
  
  const files = config.files || [];
  const results = await Promise.allSettled(files.map(f => loadSource(f)));

  const merged = [];
  const usedIds = new Set();

  results.forEach((result, i) => {
    if (result.status === 'rejected' || !result.value.length) {
      console.warn(`⚠️ Could not load "${files[i]}"`);
      return;
    }
    result.value.forEach((raw, idx) => {
      const product = normalizeProduct(raw, files[i], idx, config);
      let id = String(product.id);
      if (usedIds.has(id)) {
        let n = 2;
        while (usedIds.has(`${id}_${n}`)) n++;
        product.id = `${id}_${n}`;
      }
      usedIds.add(product.id);
      merged.push(product);
    });
  });

  if (!merged.length) throw new Error(`No products loaded for theme ${themeNum}`);
  return merged;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}