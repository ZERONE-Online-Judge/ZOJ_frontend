import heroImage from '@/assets/images/hero image.png';

export type HeroContent = {
  imageSrc: string;
  imageAlt: string;
  headline: string;
  description: string;
};

export type MainPageContent = {
  hero: HeroContent;
};

export const mainPageContent = {
  hero: {
    imageSrc: heroImage,
    imageAlt: 'ZERONE Online Judge 메인 배너',
    headline: 'ZERONE ONLINE JUDGE',
    description:
      '코딩 대회를 여는 스마트한 방법, 소규모 스터디부터 대회까지, 완벽한 대회를 완성해보세요',
  },
} satisfies MainPageContent;
