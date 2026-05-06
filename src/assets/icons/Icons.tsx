import type { CSSProperties, ImgHTMLAttributes } from 'react';
import arrowIcon from '@/assets/icons/Arrow.svg';

export const icons = {
  arrow: arrowIcon,
} as const satisfies Record<string, string>;

export type IconName = keyof typeof icons;

export function getIconSrc(name: IconName) {
  return icons[name];
}

type SvgIconProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'src'> & {
  name?: IconName;
  src?: string;
  label?: string;
  decorative?: boolean;
  size?: number | string;
};

export function SvgIcon({
  name,
  src,
  label,
  decorative = true,
  size = 24,
  style,
  ...props
}: SvgIconProps) {
  const dimension = typeof size === 'number' ? `${size}px` : size;
  const iconSrc = src ?? (name ? getIconSrc(name) : '');
  const iconStyle: CSSProperties = {
    flexShrink: 0,
    width: dimension,
    height: dimension,
    ...style,
  };

  return (
    <img
      {...props}
      alt={decorative ? '' : (label ?? '')}
      aria-hidden={decorative ? true : undefined}
      src={iconSrc}
      style={iconStyle}
    />
  );
}
