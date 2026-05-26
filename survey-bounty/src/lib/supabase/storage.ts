import { createClient } from "@/lib/supabase/client";

/**
 * 上传图片到 Supabase Storage
 * @param file - 文件对象
 * @param bucket - 存储桶名称
 * @param folder - 文件夹路径
 * @returns 公开访问 URL
 */
export async function uploadImage(
  file: File,
  bucket: string = "task-images",
  folder: string = "uploads"
): Promise<string> {
  const supabase = createClient();

  const fileExt = file.name.split(".").pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`上传失败: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}
