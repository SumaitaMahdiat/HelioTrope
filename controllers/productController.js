import Product from '../models/productModel.js';

const productFileUrl = (req, filename) =>
  `${req.protocol}://${req.get('host')}/uploads/products/${filename}`;

const normalizeStringOrArray = (v) => {
  if (Array.isArray(v)) return v;
  if (v === undefined || v === null) return [];
  const s = String(v).trim();
  if (!s) return [];
  // allow comma-separated too
  if (s.includes(',')) return s.split(',').map((x) => x.trim()).filter(Boolean);
  return [s];
};

export const listProducts = async (req, res) => {
  const products = await Product.find()
    .populate('seller', 'name email role')
    .sort({ createdAt: -1 });
  res.json({ products });
};

export const getProduct = async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id).populate('seller', 'name email role');
  if (!product) return res.status(404).json({ message: 'Product not found' });

  res.json({ product });
};

export const createProduct = async (req, res) => {
  const { name, description, price, category, tags, stock } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ message: 'name and price are required' });
  }

  const uploaded = (req.files || []).map((f) => productFileUrl(req, f.filename));

  // accept url images from either "imageUrls" or legacy "images"
  const urlImages = [
    ...normalizeStringOrArray(req.body.imageUrls),
    ...normalizeStringOrArray(req.body.images),
  ];

  const finalImages = [...uploaded, ...urlImages].filter(Boolean);

  const product = await Product.create({
    seller: req.user._id,
    name,
    description: description || '',
    price: Number(price),
    images: finalImages,
    category: category || undefined,
    tags: normalizeStringOrArray(tags),
    stock: stock !== undefined ? Number(stock) : undefined,
  });

  res.status(201).json({ product });
};

export const listMySellerProducts = async (req, res) => {
  const products = await Product.find({ seller: req.user._id }).sort({ createdAt: -1 });
  res.json({ products });
};