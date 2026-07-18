import { createClient } from './client'

export async function uploadImage(file: File, bucket: string, folder: string): Promise<string> {
  const supabase = createClient()
  
  const fileName = `${Date.now()}-${file.name}`
  const filePath = folder ? `${folder}/${fileName}` : fileName

  const { error, data } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    throw new Error(`Error uploading image: ${error.message}`)
  }

  const { data: publicData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path)

  return publicData.publicUrl
}

export async function deleteImage(bucket: string, filePath: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath])

  if (error) {
    throw new Error(`Error deleting image: ${error.message}`)
  }
}
