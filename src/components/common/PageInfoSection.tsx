import { sharedUiText } from '@/data/uiText';

export type PageInfoBox = {
  title: string;
  items?: string[];
};

export type PageInfoContent = {
  title: string;
  description: string;
  boxes: PageInfoBox[];
  examples?: PageInfoBox[];
};

type PageInfoSectionProps = {
  content: PageInfoContent;
};

export default function PageInfoSection({ content }: PageInfoSectionProps) {
  return (
    <div className="mx-auto my-24 flex w-full max-w-7xl flex-col gap-10 px-6 lg:px-8">
      <hr className="border-slate-200" />

      <header className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold break-keep text-slate-950">
          {content.title}
        </h1>
        <p className="text-base leading-7 break-keep text-slate-600">
          {content.description}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {content.boxes.map((box) => (
          <section
            className="min-h-40 rounded border border-slate-200 bg-white p-6"
            key={box.title}
          >
            <h2 className="text-xl font-semibold text-slate-950">
              {box.title}
            </h2>
            {box.items && box.items.length > 0 ? (
              <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm leading-6 text-slate-700">
                {box.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      {content.examples && content.examples.length > 0 ? (
        <section className="flex flex-col gap-5">
          <h2 className="text-2xl font-semibold text-slate-950">
            {sharedUiText.exampleSectionTitle}
          </h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {content.examples.map((example) => (
              <div
                className="min-h-36 rounded border border-dashed border-slate-300 bg-slate-50 p-5"
                key={example.title}
              >
                <h3 className="text-lg font-semibold text-slate-950">
                  {example.title}
                </h3>
                {example.items && example.items.length > 0 ? (
                  <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm leading-6 text-slate-700">
                    {example.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
