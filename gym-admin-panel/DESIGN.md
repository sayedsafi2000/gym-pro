# GymPro Design System

## Color Palette
- **Background:** `bg-slate-50` (page), `bg-white` (cards)
- **Text:** `text-slate-900` (primary), `text-slate-600` (secondary), `text-slate-500` (muted), `text-slate-400` (disabled)
- **Borders:** `border-slate-200` (default), `border-slate-100` (subtle)
- **Status:** green (active/success), yellow (warning/expiring), red (error/expired), blue (info)
- **Never use:** `gray-*` (use `slate-*` instead)

## Typography
- **Page titles:** `text-3xl font-semibold text-slate-900`
- **Section subtitles:** `text-sm uppercase tracking-[0.3em] text-slate-500`
- **Section headings:** `text-lg font-semibold text-slate-900`
- **Labels:** `text-xs text-slate-500 uppercase tracking-wide`
- **Body:** `text-sm text-slate-600`
- **Never use:** `font-bold` (use `font-semibold`)

## Spacing
- **Page headers:** `p-8`
- **Cards:** `p-6`
- **Stat cards:** `p-5`
- **Section gaps:** `gap-4` or `gap-6`
- **Page section spacing:** `space-y-6` or `space-y-8`

## Cards & Containers
- **Standard card:** `bg-white border border-slate-200 p-6 shadow-sm`
- **Header card:** `bg-white border border-slate-200 p-8 shadow-sm`
- **No gradients.** No `shadow-lg` or `shadow-xl`.

## Border Radius
- **Everything:** `rounded-[5px]`
- **Never use:** `rounded-2xl`, `rounded-3xl`, `rounded-lg`, `rounded-xl`

## Buttons
- **Primary:** `bg-slate-900 text-white hover:bg-slate-800 rounded-[5px]`
- **Secondary:** `border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-[5px]`
- **Danger:** `border border-red-200 text-red-700 hover:bg-red-50 rounded-[5px]`
- **No gradient buttons.** No `transform hover:scale-*`.

## Form Inputs
- **Style:** `border border-slate-200 rounded-[5px] px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent`
- **Labels:** `text-xs text-slate-500 uppercase tracking-wide mb-1`

## Status Badges
- **Pattern:** `inline-flex px-3 py-1 text-xs font-semibold rounded-[5px] border`
- **Active/Success:** `border-green-200 bg-green-50 text-green-700`
- **Warning:** `border-yellow-200 bg-yellow-50 text-yellow-700`
- **Error/Expired:** `border-red-200 bg-red-50 text-red-700`
- **Neutral:** `border-slate-200 bg-slate-50 text-slate-600`

## Currency
- **Symbol:** `৳` (BDT / Bangladeshi Taka)
- **Never use:** `$`

## Tables
- **Container:** `bg-white border border-slate-200 shadow-sm overflow-hidden`
- **Header row:** `bg-slate-50` with `text-xs font-medium text-slate-500 uppercase tracking-wide`
- **Row hover:** `hover:bg-slate-50`
- **Cell padding:** `px-6 py-3` or `px-6 py-4`

## Loading States
- **Spinner:** `animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600`
- **Container:** `flex items-center justify-center min-h-96`

## Toast Notifications
- **Success:** `bg-slate-900 text-white`
- **Error:** `bg-red-600 text-white`
- **Position:** fixed top-right, auto-dismiss 4s
- **Container:** `aria-live="polite" role="status"`
