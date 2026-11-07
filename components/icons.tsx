// Ikon SVG ringan (stroke, 24×24) — pengganti emoji sebagai ikon. Mewarisi currentColor.
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number; title?: string }

function Svg({ size = 16, title, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}
      focusable="false" className="ico-svg" {...rest}>
      {title && <title>{title}</title>}
      {children}
    </svg>
  )
}

export const IconPaperclip = (p: P) => <Svg {...p}><path d="m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" /></Svg>
export const IconCheck = (p: P) => <Svg {...p}><path d="M20 6 9 17l-5-5" /></Svg>
export const IconCheckCircle = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></Svg>
export const IconUpload = (p: P) => <Svg {...p}><path d="M12 15V3m0 0-4 4m4-4 4 4" /><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></Svg>
export const IconDownload = (p: P) => <Svg {...p}><path d="M12 3v12m0 0-4-4m4 4 4-4" /><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></Svg>
export const IconExternal = (p: P) => <Svg {...p}><path d="M14 4h6v6M20 4l-9 9" /><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></Svg>
export const IconTrash = (p: P) => <Svg {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Svg>
export const IconRefresh = (p: P) => <Svg {...p}><path d="M20 12a8 8 0 1 1-2.3-5.7L20 8.6" /><path d="M20 3v5.6h-5.6" /></Svg>
export const IconPlay = (p: P) => <Svg {...p}><path d="M7 4v16l13-8z" /></Svg>
export const IconInfo = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></Svg>
export const IconSparkle = (p: P) => <Svg {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 16v4M17 18h4" /></Svg>
export const IconSave = (p: P) => <Svg {...p}><path d="M5 3h11l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a1 1 0 0 1 1-1z" /><path d="M8 3v5h7V3M8 21v-7h8v7" /></Svg>
export const IconArrowRight = (p: P) => <Svg {...p}><path d="M5 12h14m-6-6 6 6-6 6" /></Svg>
export const IconFile = (p: P) => <Svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></Svg>
export const IconSun = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Svg>
export const IconMoon = (p: P) => <Svg {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></Svg>
export const IconX = (p: P) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>
export const IconSend = (p: P) => <Svg {...p}><path d="M4 12 20 4l-6 16-3-7z" /><path d="m11 13 9-9" /></Svg>
export const IconStop = (p: P) => <Svg {...p}><rect x="6" y="6" width="12" height="12" rx="2" /></Svg>
export const IconHome = (p: P) => <Svg {...p}><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></Svg>
export const IconUsers = (p: P) => <Svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" /></Svg>
export const IconFileCheck = (p: P) => <Svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="m9 14 2 2 4-4" /></Svg>
export const IconMonitor = (p: P) => <Svg {...p}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></Svg>
export const IconClipboard = (p: P) => <Svg {...p}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1" /><path d="M9 10h6M9 14h6M9 18h3" /></Svg>
export const IconRocket = (p: P) => <Svg {...p}><path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2" /><path d="M9 15l-3-3c1-4 5-8 13-9-1 8-5 12-9 13z" /><circle cx="14.5" cy="9.5" r="1.5" /></Svg>
export const IconSettings = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Svg>
export const IconKey = (p: P) => <Svg {...p}><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M17 6l3 3M15 8l2 2" /></Svg>
export const IconBook = (p: P) => <Svg {...p}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5M8 7h7" /></Svg>
export const IconSliders = (p: P) => <Svg {...p}><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></Svg>
export const IconChevron = (p: P) => <Svg {...p}><path d="m9 6 6 6-6 6" /></Svg>
export const IconShield = (p: P) => <Svg {...p}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /></Svg>
export const IconSearch = (p: P) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>
export const IconAlert = (p: P) => <Svg {...p}><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17h.01" /></Svg>
export const IconClock = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
export const IconPause = (p: P) => <Svg {...p}><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></Svg>
export const IconEdit = (p: P) => <Svg {...p}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></Svg>
export const IconEye = (p: P) => <Svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Svg>
export const IconPuzzle = (p: P) => <Svg {...p}><path d="M10 4a2 2 0 1 1 4 0v1h4a1 1 0 0 1 1 1v4h-1a2 2 0 1 0 0 4h1v4a1 1 0 0 1-1 1h-4v-1a2 2 0 1 0-4 0v1H6a1 1 0 0 1-1-1v-4h1a2 2 0 1 0 0-4H5V6a1 1 0 0 1 1-1h4z" /></Svg>
export const IconBrain = (p: P) => <Svg {...p}><path d="M9.5 3A2.5 2.5 0 0 0 7 5.5a2.5 2.5 0 0 0-2.5 2.7A3 3 0 0 0 4 13.5 3 3 0 0 0 6.5 18 3 3 0 0 0 12 19.5V4.5A2.5 2.5 0 0 0 9.5 3z" /><path d="M14.5 3A2.5 2.5 0 0 1 17 5.5a2.5 2.5 0 0 1 2.5 2.7 3 3 0 0 1 .5 5.3 3 3 0 0 1-2.5 4.5 3 3 0 0 1-5.5 1.5" /></Svg>
export const IconMic = (p: P) => <Svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></Svg>
export const IconUser = (p: P) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Svg>
export const IconArrowLeft = (p: P) => <Svg {...p}><path d="M19 12H5m6-6-6 6 6 6" /></Svg>
export const IconAward = (p: P) => <Svg {...p}><circle cx="12" cy="9" r="6" /><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7" /></Svg>
export const IconMaximize = (p: P) => <Svg {...p}><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" /></Svg>
export const IconMinimize = (p: P) => <Svg {...p}><path d="M4 14h6v6M20 10h-6V4M10 14l-7 7M14 10l7-7" /></Svg>
