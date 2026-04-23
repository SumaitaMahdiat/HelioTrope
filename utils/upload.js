import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const makeImageUploader = ({ subfolder, maxFiles }) => {
  const uploadDir = path.join(__dirname, '..', 'uploads', subfolder);
  fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '');
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  });

  const fileFilter = (req, file, cb) => {
    const ok = file.mimetype.startsWith('image/');
    cb(ok ? null : new Error('Only image files allowed'), ok);
  };

  return multer({
    storage,
    fileFilter,
    limits: { files: maxFiles, fileSize: 3 * 1024 * 1024 }, // 3MB each
  });
};

export const uploadReviewImages = makeImageUploader({ subfolder: 'reviews', maxFiles: 3 });
export const uploadProductImages = makeImageUploader({ subfolder: 'products', maxFiles: 6 });