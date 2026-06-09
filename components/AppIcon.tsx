export type AppIconName =
  | "arrow-left"
  | "calendar"
  | "camera"
  | "chevrons-left"
  | "file"
  | "help"
  | "list"
  | "mic"
  | "record"
  | "settings"
  | "sparkles"
  | "speaker"
  | "transcript"
  | "video"
  | "waveform";

export function AppIcon({
  name,
  size = 20,
  strokeWidth = 1.8,
}: {
  name: AppIconName;
  size?: number;
  strokeWidth?: number;
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth,
  };

  return (
    <svg aria-hidden="true" height={size} viewBox="0 0 24 24" width={size}>
      {name === "arrow-left" && <path {...common} d="m15 18-6-6 6-6M9 12h11" />}
      {name === "calendar" && (
        <>
          <rect {...common} height="17" rx="2" width="18" x="3" y="4" />
          <path {...common} d="M8 2v4m8-4v4M3 9h18m-13 4h2m4 0h2m-8 4h2m4 0h2" />
        </>
      )}
      {name === "camera" && (
        <>
          <path {...common} d="M14.5 5 13 3h-2L9.5 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />
          <circle {...common} cx="12" cy="12" r="4" />
        </>
      )}
      {name === "chevrons-left" && <path {...common} d="m13 17-5-5 5-5m6 10-5-5 5-5" />}
      {name === "file" && (
        <>
          <path {...common} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path {...common} d="M14 2v6h6M8 13h8m-8 4h8" />
        </>
      )}
      {name === "help" && (
        <>
          <circle {...common} cx="12" cy="12" r="9" />
          <path {...common} d="M9.7 9a2.5 2.5 0 1 1 3.6 2.25c-.85.45-1.3.9-1.3 1.75m0 3h.01" />
        </>
      )}
      {name === "list" && (
        <>
          <path {...common} d="M9 6h11M9 12h11M9 18h11" />
          <circle cx="4" cy="6" fill="currentColor" r="1.2" />
          <circle cx="4" cy="12" fill="currentColor" r="1.2" />
          <circle cx="4" cy="18" fill="currentColor" r="1.2" />
        </>
      )}
      {name === "mic" && (
        <>
          <rect {...common} height="13" rx="4" width="8" x="8" y="2" />
          <path {...common} d="M5 11a7 7 0 0 0 14 0m-7 7v4m-4 0h8" />
        </>
      )}
      {name === "record" && <circle cx="12" cy="12" fill="currentColor" r="7" />}
      {name === "settings" && (
        <>
          <circle {...common} cx="12" cy="12" r="3" />
          <path {...common} d="M19 12a7 7 0 0 0-.12-1.28l2-1.55-2-3.46-2.46 1A7 7 0 0 0 14.2 5.4L13.8 3h-4l-.4 2.4a7 7 0 0 0-2.22 1.3l-2.46-1-2 3.46 2 1.55A7 7 0 0 0 4.6 12a7 7 0 0 0 .12 1.28l-2 1.55 2 3.46 2.46-1a7 7 0 0 0 2.22 1.3l.4 2.4h4l.4-2.4a7 7 0 0 0 2.22-1.3l2.46 1 2-3.46-2-1.55A7 7 0 0 0 19 12Z" />
        </>
      )}
      {name === "sparkles" && <path {...common} d="m12 3 1.1 3.2L16 7.5l-2.9 1.3L12 12l-1.1-3.2L8 7.5l2.9-1.3zm6 9 .8 2.2L21 15l-2.2.8L18 18l-.8-2.2L15 15l2.2-.8zM6 13l.8 2.2L9 16l-2.2.8L6 19l-.8-2.2L3 16l2.2-.8z" />}
      {name === "speaker" && (
        <>
          <path {...common} d="M11 5 6 9H3v6h3l5 4zM15 9a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12" />
        </>
      )}
      {name === "transcript" && (
        <>
          <path {...common} d="M20 15a3 3 0 0 1-3 3H9l-5 4v-4a3 3 0 0 1-2-3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3z" />
          <path {...common} d="M7 8h8m-8 4h6" />
        </>
      )}
      {name === "video" && (
        <>
          <rect {...common} height="14" rx="2" width="14" x="3" y="5" />
          <path {...common} d="m17 10 4-2v8l-4-2z" />
        </>
      )}
      {name === "waveform" && <path {...common} d="M4 14v-4m4 7V7m4 13V4m4 13V7m4 7v-4" />}
    </svg>
  );
}
