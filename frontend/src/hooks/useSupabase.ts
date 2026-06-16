import { useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { uploadImage, deleteImage } from '@/utils/supabase/storage'

export function useSupabase() {
  const supabase = createClient()

  const uploadRaceImage = useCallback(
    async (file: File): Promise<string> => {
      return uploadImage(file, 'Razas', '')
    },
    []
  )

  const deleteRaceImage = useCallback(
    async (filePath: string): Promise<void> => {
      return deleteImage('Razas', filePath)
    },
    []
  )

  return {
    supabase,
    uploadRaceImage,
    deleteRaceImage,
  }
}
