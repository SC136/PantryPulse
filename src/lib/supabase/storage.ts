import { createClient } from '@/lib/supabase/client';

export async function uploadFridgeScan(file: File, userId: string): Promise<string> {
  const supabase = createClient();
  const fileName = `${userId}/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from('fridge-scans')
    .upload(fileName, file, { upsert: true });
  if (error) throw error;

  const { data: signedData } = await supabase.storage
    .from('fridge-scans')
    .createSignedUrl(data.path, 3600);
  return signedData?.signedUrl || '';
}

export async function uploadReceiptScan(file: File, userId: string): Promise<string> {
  const supabase = createClient();
  const fileName = `${userId}/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from('receipt-scans')
    .upload(fileName, file, { upsert: true });
  if (error) throw error;

  const { data: signedData } = await supabase.storage
    .from('receipt-scans')
    .createSignedUrl(data.path, 3600);
  return signedData?.signedUrl || '';
}

export async function uploadItemPhoto(file: File, userId: string): Promise<string> {
  const supabase = createClient();
  const fileName = `${userId}/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from('item-photos')
    .upload(fileName, file, { upsert: true });
  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('item-photos')
    .getPublicUrl(data.path);
  return urlData.publicUrl;
}

export async function deleteStorageFile(bucket: string, path: string) {
  const supabase = createClient();
  await supabase.storage.from(bucket).remove([path]);
}
