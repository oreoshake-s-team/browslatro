import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from "react";
import { isRenderProfilingEnabled, recordRender } from "./renderProfiling";

interface RenderProfilerProps {
  readonly id: string;
  readonly children: ReactNode;
}

const handleRender: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime,
) => {
  recordRender({ id, phase, actualDuration, baseDuration, startTime, commitTime });
};

export default function RenderProfiler({ id, children }: RenderProfilerProps): ReactNode {
  if (!isRenderProfilingEnabled()) return children;
  return (
    <Profiler id={id} onRender={handleRender}>
      {children}
    </Profiler>
  );
}
