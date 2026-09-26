"use client";

import React from "react";
import type { AttachedImage, AttachedTextFile } from "../ChatInput-draft-attachments";

interface AttachmentPreviewsProps {
  error: string | null;
  images: AttachedImage[];
  files: AttachedTextFile[];
  removeImageLabel: string;
  removeFileLabel: string;
  onRemoveImage: (index: number) => void;
  onRemoveFile: (index: number) => void;
}

function RemoveIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <line x1="1" y1="1" x2="7" y2="7" /><line x1="7" y1="1" x2="1" y2="7" />
    </svg>
  );
}

export function AttachmentPreviews({ error, images, files, removeImageLabel, removeFileLabel, onRemoveImage, onRemoveFile }: AttachmentPreviewsProps) {
  return (
    <>
      {error && (
        <div role="alert" className="composer-attachment-error">
          {error}
        </div>
      )}
      {images.length > 0 && (
        <div className="composer-attachments composer-image-attachments">
          {images.map((image, index) => (
            <div key={`${image.previewUrl}:${index}`} className="composer-image-attachment">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.previewUrl} alt="" />
              <button className="attachment-remove-button" type="button" onClick={() => onRemoveImage(index)} title={removeImageLabel} aria-label={removeImageLabel}>
                <RemoveIcon />
              </button>
            </div>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div className="composer-attachments composer-file-attachments">
          {files.map((file, index) => (
            <div key={`${file.name}:${index}`} className="composer-file-attachment">
              <span className="composer-file-icon" aria-hidden="true">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
              </span>
              <span title={file.name} className="composer-file-name">{file.name}</span>
              <span className="composer-file-size">{file.size < 1024 ? `${file.size} B` : `${Math.round(file.size / 1024)} KB`}</span>
              <button className="attachment-remove-button" type="button" onClick={() => onRemoveFile(index)} title={removeFileLabel} aria-label={removeFileLabel}>
                <RemoveIcon />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
