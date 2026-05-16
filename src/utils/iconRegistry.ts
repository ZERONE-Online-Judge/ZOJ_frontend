import arrowIcon from '@/assets/icons/Arrow.svg?raw';

export const icons = {
  arrow: arrowIcon,
} as const satisfies Record<string, string>;

export type IconName = keyof typeof icons;

export function getIconMarkup(name: IconName) {
  return icons[name];
}
