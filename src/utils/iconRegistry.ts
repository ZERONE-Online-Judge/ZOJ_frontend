import alertIcon from '@/assets/icons/alert.svg?raw';
import arrowRightIcon from '@/assets/icons/arrow-right.svg?raw';
import checkIcon from '@/assets/icons/check.svg?raw';
import clipboardIcon from '@/assets/icons/clipboard.svg?raw';
import closeIcon from '@/assets/icons/close.svg?raw';
import megaphoneIcon from '@/assets/icons/megaphone.svg?raw';
import timerIcon from '@/assets/icons/timer.svg?raw';
import trophyIcon from '@/assets/icons/trophy.svg?raw';

export const icons = {
  alert: alertIcon,
  arrow: arrowRightIcon,
  arrowRight: arrowRightIcon,
  check: checkIcon,
  clipboard: clipboardIcon,
  close: closeIcon,
  megaphone: megaphoneIcon,
  timer: timerIcon,
  trophy: trophyIcon,
} as const satisfies Record<string, string>;

export type IconName = keyof typeof icons;

export function getIconMarkup(name: IconName) {
  return icons[name];
}
