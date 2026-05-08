import type { CSSProperties, HTMLAttributes } from 'react';
import arrowIcon from '@/assets/icons/Arrow.svg?raw';

export const icons = {
  arrow: arrowIcon,
} as const satisfies Record<string, string>;

export type IconName = keyof typeof icons;

export function getIconMarkup(name: IconName) {
  return icons[name];
}

type SvgIconProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  'children' | 'color'
> & {
  name?: IconName;
  markup?: string;
  label?: string;
  decorative?: boolean;
  size?: number | string;
  color?: string;
};

function getSizedMarkup(markup: string) {
  return markup
    .replace(/\s(width|height)="[^"]*"/g, '')
    .replace('<svg ', '<svg width="100%" height="100%" ');
}

export function SvgIcon({
  name,
  markup,
  label,
  decorative = true,
  size = 24,
  color = 'currentColor',
  style,
  ...props
}: SvgIconProps) {
  const dimension = typeof size === 'number' ? `${size}px` : size;
  const iconMarkup = getSizedMarkup(
    markup ?? (name ? getIconMarkup(name) : ''),
  );
  const iconStyle: CSSProperties = {
    display: 'inline-flex',
    flexShrink: 0,
    width: dimension,
    height: dimension,
    color,
    ...style,
  };

  return (
    <span
      {...props}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      dangerouslySetInnerHTML={{ __html: iconMarkup }}
      role={decorative ? undefined : 'img'}
      style={iconStyle}
    />
  );
}
