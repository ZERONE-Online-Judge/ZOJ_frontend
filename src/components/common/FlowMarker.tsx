type FlowMarkerProps = {
  title?: string;
  children: string;
};

export default function FlowMarker({
  title = '이번에 추가한 스크린 플로우',
  children,
}: FlowMarkerProps) {
  return (
    <div className="rounded border-2 border-amber-300 bg-amber-50 px-5 py-4 shadow-sm">
      <p className="text-xs font-bold tracking-normal text-amber-700">
        {title}
      </p>
      <p className="mt-1 text-sm leading-6 font-semibold text-amber-950">
        {children}
      </p>
    </div>
  );
}
