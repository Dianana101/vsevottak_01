// backend/src/services/uploadImage.ts
import { supabase } from '../lib/supabase';

/**
 * Загружает изображение в Supabase Storage и возвращает публичный URL
 * @param imageBuffer - Buffer с изображением
 * @param fileName - Имя файла (например, post-id.png)
 * @returns Публичный URL изображения
 */
export async function uploadImageToStorage(
  imageBuffer: Buffer,
  fileName: string
): Promise<string> {
  // Загружаем в Supabase Storage
  const { data, error } = await supabase.storage
    .from('post-images')
    .upload(fileName, imageBuffer, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: true // Перезаписываем, если файл существует
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Получаем публичный URL
  const { data: { publicUrl } } = supabase.storage
    .from('post-images')
    .getPublicUrl(fileName);

  return publicUrl;
}
