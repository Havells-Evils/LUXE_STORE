/* =========================================================
   🔗 PRODUCT SOURCES MANAGER
   ---------------------------------------------------------
   Central place to manage all JSON product files.
   Edit PRODUCT_SOURCES below to add/remove product files.
   
   The collection page will automatically load and merge
   ALL products from ALL files listed here.
   ========================================================= */

const PRODUCT_SOURCES = [
  'f.json'
  // 'products4.json',
  // 'products5.json',
  // ... add as many as you need (keep the trailing comma off the last entry)
];

/* =========================================================
   NORMALIZE ONE PRODUCT
   Ensures every product has consistent shape no matter
   which JSON file it came from.
   ========================================================= */
function normalizeProduct(p, sourceFile, index) {
  const images = (Array.isArray(p.images) ? p.images : []).filter(Boolean);
  return {
    ...p,
    id: (p.id !== undefined && p.id !== null && p.id !== '') ?
      p.id :
      `${sourceFile}-${index}`,
    features: [...new Set(Array.isArray(p.features) ? p.features : [])],
    images: images.length ? images : (p.image ? [p.image] : []),
    link: p.link || '#',
    _source: sourceFile
  };
}

/* =========================================================
   LOAD A SINGLE JSON FILE
   Supports:  [ {...}, {...} ]   OR   { "products": [ ... ] }
   ========================================================= */
async function loadSource(file) {
  const res = await fetch(file, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${file} → HTTP ${res.status}`);
  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.products)) return data.products;
  throw new Error(`${file} → invalid format (expected an array or { products: [...] })`);
}

/* =========================================================
   FETCH + MERGE ALL JSON FILES
   Returns: { merged, failedFiles }
   ========================================================= */
async function loadAllProducts() {
  const results = await Promise.allSettled(
    PRODUCT_SOURCES.map(file => loadSource(file))
  );
  
  const merged = [];
  const usedIds = new Set();
  const failedFiles = [];
  
  results.forEach((result, i) => {
    const file = PRODUCT_SOURCES[i];
    
    if (result.status === 'rejected') {
      failedFiles.push(file);
      console.warn(`⚠️ Could not load "${file}":`, result.reason);
      return;
    }
    
    const list = result.value;
    console.log(`✅ ${file} → ${list.length} products`);
    
    list.forEach((raw, idx) => {
      const product = normalizeProduct(raw, file, idx);
      
      // Guarantee globally-unique ids across all files
      let id = String(product.id);
      if (usedIds.has(id)) {
        let n = 2;
        while (usedIds.has(`${id}_${n}`)) n++;
        id = `${id}_${n}`;
        product.id = id;
      }
      usedIds.add(id);
      
      merged.push(product);
    });
  });
  
  if (!merged.length) {
    throw new Error('No products could be loaded from any source file.');
  }
  
  console.log(
    `🛍️ Total combined products: ${merged.length} ` +
    `(from ${PRODUCT_SOURCES.length - failedFiles.length}/${PRODUCT_SOURCES.length} files)`
  );
  
  return { merged, failedFiles };
}

/* =========================================================
   RANDOM SHUFFLE (Fisher–Yates)
   ========================================================= */
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
