import React, { useRef } from 'react';
import { validateImageFile } from '../utils';

interface ImageUploadProps {
  onImageUpload: (file: File) => void;
  className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUpload, className = '' }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.isValid) {
      alert(validation.error);
      // Reset the input to clear file name
      if (event.target.value) event.target.value = '';
      return;
    }

    onImageUpload(file);
    
    // Reset the input to allow uploading the same file again
    if (event.target.value) event.target.value = '';
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png"
        onChange={handleFileChange}
        className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      <div className="text-xs text-gray-500">
        PNG only, max 4MB
      </div>
    </div>
  );
};

export default ImageUpload; 