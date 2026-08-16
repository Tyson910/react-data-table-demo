import type { PropsWithChildren } from "react";

export type IconProps = { size?: number };

/** Base SVG wrapper for inline Tabler-style icons — keeps the bundle free of an icon dependency. */
function Icon({ size = 24, children }: PropsWithChildren<IconProps>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

export const IconCloudUpload = ({ size }: IconProps) => (
  <Icon size={size}>
    <path d="M7 18a4.6 4.4 0 0 1 0 -9a5 4.5 0 0 1 11 2h1a3.5 3.5 0 0 1 0 7h-1" />
    <path d="M9 15l3 -3l3 3" />
    <path d="M12 12v9" />
  </Icon>
);

export const IconFile = ({ size }: IconProps) => (
  <Icon size={size}>
    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
    <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v9a2 2 0 0 1 -2 2z" />
    <path d="M9 17h6" />
    <path d="M9 13h6" />
  </Icon>
);

export const IconCheck = ({ size }: IconProps) => (
  <Icon size={size}>
    <path d="M5 12l5 5l10 -10" />
  </Icon>
);

export const IconCircleCheck = ({ size }: IconProps) => (
  <Icon size={size}>
    <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
    <path d="M9 12l2 2l4 -4" />
  </Icon>
);

export const IconX = ({ size }: IconProps) => (
  <Icon size={size}>
    <path d="M18 6l-12 12" />
    <path d="M6 6l12 12" />
  </Icon>
);

export const IconAlertTriangle = ({ size }: IconProps) => (
  <Icon size={size}>
    <path d="M12 9v4" />
    <path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z" />
    <path d="M12 16h.01" />
  </Icon>
);

export const IconArrowRight = ({ size }: IconProps) => (
  <Icon size={size}>
    <path d="M5 12h14" />
    <path d="M13 18l6 -6" />
    <path d="M13 6l6 6" />
  </Icon>
);

export const IconColumns = ({ size }: IconProps) => (
  <Icon size={size}>
    <path d="M3 5a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-14z" />
    <path d="M9 4v16" />
    <path d="M15 4v16" />
  </Icon>
);

export const IconChevronDown = ({ size }: IconProps) => (
  <Icon size={size}>
    <path d="M6 9l6 6l6 -6" />
  </Icon>
);

export const IconTrash = ({ size }: IconProps) => (
  <Icon size={size}>
    <path d="M4 7l16 0" />
    <path d="M10 11l0 6" />
    <path d="M14 11l0 6" />
    <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
    <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
  </Icon>
);

export const IconDownload = ({ size }: IconProps) => (
  <Icon size={size}>
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" />
    <path d="M7 11l5 5l5 -5" />
    <path d="M12 4v12" />
  </Icon>
);

export const IconFileCode = ({ size }: IconProps) => (
  <Icon size={size}>
    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
    <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v9a2 2 0 0 1 -2 2z" />
    <path d="M10 13l-1 2l1 2" />
    <path d="M14 13l1 2l-1 2" />
  </Icon>
);
