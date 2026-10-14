import { Check } from 'lucide-react';
import Link from 'next/link';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { initials } from '@/lib/format';

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'brand';
type Size = 'sm' | 'md' | 'lg';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/20 disabled:pointer-events-none disabled:opacity-50';
const BUTTON_VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:opacity-85',
  secondary: 'border border-line-strong bg-elevated text-fg hover:bg-surface',
  ghost: 'text-muted hover:bg-surface hover:text-fg',
  danger: 'border border-line-strong bg-elevated text-live hover:bg-live-soft',
  brand: 'bg-brand text-white hover:opacity-90',
};
const BUTTON_SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-[15px]',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string): string {
  return cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className);
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} {...props}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

const FIELD =
  'w-full rounded-lg border border-line-strong bg-elevated px-3 text-sm text-fg placeholder:text-subtle ' +
  'transition focus:border-fg/40 focus:outline-none focus:ring-2 focus:ring-fg/10 disabled:opacity-60';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD, 'h-10', className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(FIELD, 'h-10 pr-8', className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FIELD, 'min-h-24 py-2', className)} {...props} />;
}

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-[13px] font-medium text-fg">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-xl border border-line bg-elevated', className)}>{children}</div>;
}

type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'blue';
const TONES: Record<Tone, string> = {
  neutral: 'border-line bg-surface text-muted',
  green: 'border-transparent bg-brand-soft text-brand',
  amber: 'border-transparent bg-warn-soft text-warn',
  red: 'border-transparent bg-live-soft text-live',
  blue: 'border-transparent bg-info-soft text-info',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium', TONES[tone], className)}>
      {children}
    </span>
  );
}

export function LiveBadge({ label = 'En vivo' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-live-soft px-2 py-0.5 text-xs font-semibold text-live">
      <span className="live-dot h-1.5 w-1.5 rounded-full bg-live" />
      {label}
    </span>
  );
}

export function StatusDot({ status }: { status: 'up' | 'degraded' | 'down' | string }) {
  const color = status === 'up' || status === 'ok' ? 'bg-brand' : status === 'degraded' ? 'bg-warn' : 'bg-live';
  return <span className={cn('inline-block h-2 w-2 rounded-full', color)} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('h-5 w-5 animate-spin text-current', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function PageSpinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-subtle">
      <Spinner className="h-6 w-6" />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong px-6 py-12 text-center', className)}>
      {icon && <div className="mb-3 text-subtle">{icon}</div>}
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Notice({ tone = 'neutral', title, children }: { tone?: Tone; title?: string; children?: ReactNode }) {
  return (
    <div className={cn('rounded-xl border px-4 py-3 text-sm', TONES[tone])}>
      {title && <p className="font-medium">{title}</p>}
      {children && <div className={cn(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-[13px] text-muted">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-fg">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'live' | 'brand' }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={cn('tabular mt-1.5 text-2xl font-semibold tracking-tight', tone === 'live' && 'text-live', tone === 'brand' && 'text-brand')}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export function TeamBadge({ name, color, size = 'md' }: { name: string; color?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'sm' ? 'h-6 w-6 text-[10px]' : size === 'lg' ? 'h-14 w-14 text-lg' : 'h-8 w-8 text-xs';
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', dims)}
      style={{ backgroundColor: color ?? '#737373' }}
      aria-hidden
    >
      {initials(name) || '·'}
    </span>
  );
}

export interface TabItem {
  key: string;
  label: string;
  count?: number;
  /** Muestra un check junto al nombre (p. ej. paso completo del flujo de una liga). */
  done?: boolean;
}

/** Pestañas minimalistas (subrayado). Con `hrefFor` funcionan como enlaces (sirven en SSR). */
export function Tabs({
  tabs,
  active,
  hrefFor,
  onChange,
}: {
  tabs: TabItem[];
  active: string;
  hrefFor?: (key: string) => string;
  onChange?: (key: string) => void;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-6 border-b border-line">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          const className = cn(
            '-mb-px border-b-2 pb-3 text-sm transition',
            isActive ? 'border-fg font-medium text-fg' : 'border-transparent text-muted hover:text-fg',
          );
          const content = (
            <>
              {tab.label}
              {tab.count !== undefined && <span className="ml-1.5 text-xs text-subtle">{tab.count}</span>}
              {tab.done && (
                <>
                  <Check aria-hidden className="ml-1 inline h-3.5 w-3.5 -translate-y-px text-brand" strokeWidth={3} />
                  <span className="sr-only"> (completo)</span>
                </>
              )}
            </>
          );
          return hrefFor ? (
            <Link key={tab.key} href={hrefFor(tab.key)} className={className} scroll={false}>
              {content}
            </Link>
          ) : (
            <button key={tab.key} type="button" className={className} onClick={() => onChange?.(tab.key)}>
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Pills<T extends string>({
  options,
  value,
  hrefFor,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  hrefFor?: (value: T) => string;
  onChange?: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const className = cn(
          'rounded-full border px-3 py-1 text-[13px] transition',
          option.value === value ? 'border-fg bg-fg text-bg' : 'border-line-strong text-muted hover:text-fg',
        );
        return hrefFor ? (
          <Link key={option.value} href={hrefFor(option.value)} className={className} scroll={false}>
            {option.label}
          </Link>
        ) : (
          <button key={option.value} type="button" className={className} onClick={() => onChange?.(option.value)}>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-line', className)}>
      <table className="w-full min-w-max text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn('border-b border-line bg-surface px-3 py-2.5 text-xs font-medium text-muted', className)}>{children}</th>;
}

export function Td({ children, className, colSpan }: { children?: ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cn('border-b border-line px-3 py-2.5 align-middle', className)}>
      {children}
    </td>
  );
}
