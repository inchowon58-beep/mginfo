"use client";

export function MultiFileButton({
  label,
  busy,
  onFiles,
  multiple = true,
  folder = false,
}: {
  label: string;
  busy?: boolean;
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  folder?: boolean;
}) {
  return (
    <label className={`btn btn-ghost cover-file-btn${busy ? " is-disabled" : ""}`}>
      {label}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/*"
        multiple={multiple}
        disabled={busy}
        {...(folder ? { webkitdirectory: "", directory: "" } : {})}
        onChange={(e) => {
          const picked = Array.from(e.target.files || []);
          e.target.value = "";
          if (picked.length) onFiles(picked);
        }}
      />
    </label>
  );
}
