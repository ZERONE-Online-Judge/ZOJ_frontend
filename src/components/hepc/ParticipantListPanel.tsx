export type ParticipantListContent = {
  title: string;
  names: string[];
};

type ParticipantListPanelProps = {
  content: ParticipantListContent;
};

export default function ParticipantListPanel({
  content,
}: ParticipantListPanelProps) {
  return (
    <section className="mx-6 mt-10 lg:mx-64">
      <div className="rounded border border-slate-200 bg-white p-6">
        <h2 className="text-2xl font-semibold text-slate-950">
          {content.title}
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          {content.names.join(', ')}
        </p>
      </div>
    </section>
  );
}
