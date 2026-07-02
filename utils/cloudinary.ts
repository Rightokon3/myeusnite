export const CLOUDINARY_CLOUD_NAME = 'diogva6k1';
export const CLOUDINARY_UPLOAD_PRESET = 'myappeunesite';

type ResourceType = 'image' | 'video';

interface UploadOptions {
  uri?: string;
  base64?: string;
  resourceType: ResourceType;
  folder: string;
  fileName?: string;
}

export async function uploadToCloudinary({
  uri,
  base64,
  resourceType,
  folder,
  fileName,
}: UploadOptions): Promise<string> {
  try {
    console.log('========== CLOUDINARY UPLOAD ==========');
    console.log('Cloud Name:', CLOUDINARY_CLOUD_NAME);
    console.log('Upload Preset:', CLOUDINARY_UPLOAD_PRESET);
    console.log('Folder:', folder);

    const formData = new FormData();

    const name =
      fileName ||
      `upload_${Date.now()}.${resourceType === 'video' ? 'mp4' : 'jpg'}`;

    let fileToUpload: any;

    // 🔥 PRIORITY 1: BASE64 (MOST RELIABLE FOR EXPO)
    if (base64) {
      fileToUpload = `data:image/jpeg;base64,${base64}`;
      console.log('Uploading BASE64 image');
    }

    // 🔥 FALLBACK: URI (can break on Expo sometimes)
    else if (uri) {
      fileToUpload = {
        uri,
        name,
        type: resourceType === 'video' ? 'video/mp4' : 'image/jpeg',
      };
      console.log('Uploading URI file:', uri);
    } else {
      throw new Error('No file provided to upload');
    }

    formData.append('file', fileToUpload);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);

    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

    console.log('POST URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    console.log('========== CLOUDINARY RESPONSE ==========');
    console.log(data);

    if (!response.ok) {
      console.log('UPLOAD FAILED STATUS:', response.status);
      throw new Error(data?.error?.message || 'Cloudinary upload failed');
    }

    if (!data.secure_url) {
      throw new Error('No secure_url returned from Cloudinary');
    }

    console.log('UPLOAD SUCCESS URL:', data.secure_url);

    return data.secure_url;
  } catch (err) {
    console.log('========== CLOUDINARY ERROR ==========');
    console.log(err);
    throw err;
  }
}