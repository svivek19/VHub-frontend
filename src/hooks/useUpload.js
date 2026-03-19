import { useState } from "react";
import { uploadToCloudinary } from "@/services/uploadApi";

export const useUpload = () => {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const upload = async (file) => {
    setUploading(true);
    setProgress(0);

    try {
      const url = await uploadToCloudinary(file, setProgress);
      return url;
    } finally {
      setUploading(false);
    }
  };

  return { upload, progress, uploading };
};
