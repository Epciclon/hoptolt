import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  context: { params: { bucket: string; path: string[] } }
) {
  const bucket = context.params.bucket;
  const filePath = context.params.path.join('/');

  // Create a Supabase server client that automatically picks up the user's cookies.
  const supabase = await createClient();

  // Verify the user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Generate a signed URL valid for 1 hour (3600 seconds)
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 3600);

  if (error || !data?.signedUrl) {
    console.error(`Error generating signed URL for ${bucket}/${filePath}:`, error);
    return new NextResponse(JSON.stringify({ error, bucket, filePath }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  // Redirect the browser to the signed URL
  return NextResponse.redirect(data.signedUrl);
}
