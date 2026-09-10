"use client";

import { useRef } from "react";

export function MultiFileButton({
  label,
  busy,
  onFiles,
  multiple = true,
  folder = false,
}: {
  label: string;
  busy?: boolean;
  onFiles: (files: FileList) => void;
  multiple?: boolean;
  folder?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        className="admin-file-input"
        type="file"
        accept="image/*"
        multiple={multiple}
        disabled={busy}
        {...(folder ? { webkitdirectory: "", directory: "" } : {})}
        onChange={(e) => {
          const files = e.target.files;
          e.target.value = "";
          if (files?.length) onFiles(files);
        }}
      />
      <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
        {label}
      </button>
    </>
  );
}
