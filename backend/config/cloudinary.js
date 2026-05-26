/**
 * Cloudinary v2 — direct upload using buffer (no multer-storage-cloudinary needed)
 * Set env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

/**
 * Upload a Buffer directly to Cloudinary
 * @param {Buffer} buffer  - file buffer from multer memoryStorage
 * @param {string} userId  - used as public_id
 * @returns {Promise<string>} secure_url
 */
export async function uploadAvatar(buffer, userId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:         'soundflow/avatars',
        public_id:      `avatar_${userId}`,
        overwrite:      true,
        transformation: [
          { width: 300, height: 300, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (err, result) => {
        if (err) reject(new Error(err.message || 'Cloudinary upload failed'));
        else     resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}
